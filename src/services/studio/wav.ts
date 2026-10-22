// Voz do iPhone em WAV (PCM 16 bits, mono, 48 kHz), gravada no computador no mesmo relógio
// de áudio do vídeo: começa e termina junto com a tomada, então o arquivo já sai sincronizado
// e com a mesma duração. Sem voz (iPhone caiu), entra silêncio e a linha do tempo continua.
import type { DiskFile } from './disk'

const BATCH = 4096

const WORKLET = `
class AthgPcmTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(${BATCH}); this.n = 0; this.at = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (this.n === 0) this.at = currentFrame
    if (ch) this.buf.set(ch, this.n)
    else this.buf.fill(0, this.n, this.n + 128)
    this.n += 128
    if (this.n >= ${BATCH}) {
      this.port.postMessage({ frame: this.at, data: this.buf }, [this.buf.buffer])
      this.buf = new Float32Array(${BATCH})
      this.n = 0
    }
    return true
  }
}
registerProcessor('athg-pcm-tap', AthgPcmTap)
`

function wavHeader(dataBytes: number, sampleRate: number) {
  const b = new DataView(new ArrayBuffer(44))
  const text = (o: number, s: string) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  b.setUint32(4, 36 + dataBytes, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  b.setUint32(16, 16, true)
  b.setUint16(20, 1, true) // PCM
  b.setUint16(22, 1, true) // mono
  b.setUint32(24, sampleRate, true)
  b.setUint32(28, sampleRate * 2, true)
  b.setUint16(32, 2, true)
  b.setUint16(34, 16, true)
  text(36, 'data')
  b.setUint32(40, dataBytes, true)
  return b.buffer
}

export class VoiceTap {
  private node: AudioWorkletNode
  private file: DiskFile | null = null
  private from = 0
  private until = Infinity
  private bytes = 0
  private finish: (() => void) | null = null
  /** Recebe todos os pedaços (frame do AudioContext + amostras), gravando ou não: o ATHG Gravador usa. */
  onPcm: ((frame: number, data: Float32Array) => void) | null = null

  private constructor(private ctx: AudioContext, source: AudioNode) {
    this.node = new AudioWorkletNode(ctx, 'athg-pcm-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] })
    source.connect(this.node)
    // Precisa estar ligado a um destino para o navegador processar (a saída é silêncio).
    this.node.connect(ctx.createMediaStreamDestination())
    this.node.port.onmessage = (e: MessageEvent<{ frame: number; data: Float32Array }>) => this.onChunk(e.data.frame, e.data.data)
  }

  static async create(ctx: AudioContext, source: AudioNode) {
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }))
    try {
      await ctx.audioWorklet.addModule(url)
    } finally {
      URL.revokeObjectURL(url)
    }
    return new VoiceTap(ctx, source)
  }

  private now() {
    return Math.round(this.ctx.currentTime * this.ctx.sampleRate)
  }

  /** Começa agora (mesmo instante em que o vídeo começa). */
  start(file: DiskFile) {
    this.file = file
    this.bytes = 0
    this.from = this.now()
    this.until = Infinity
    file.write(wavHeader(0, this.ctx.sampleRate))
  }

  /**
   * Para agora (no mesmo instante do vídeo). Devolve uma função que fecha o arquivo:
   * passe a duração final do vídeo para a voz terminar exatamente junto com ele.
   */
  stop(): Promise<(videoSeconds: number | null) => Promise<void>> {
    const file = this.file
    if (!file) return Promise.resolve(async () => {})
    this.until = this.now()
    const sampleRate = this.ctx.sampleRate
    return new Promise((resolve) => {
      const done = () => {
        if (this.file !== file) return
        this.file = null
        this.finish = null
        const recorded = this.bytes
        resolve(async (videoSeconds) => {
          const target = videoSeconds ? Math.round(videoSeconds * sampleRate) * 2 : recorded
          const bytes = Math.min(recorded, target)
          if (bytes < recorded) file.truncate(44 + bytes)
          file.writeAt(0, wavHeader(bytes, sampleRate))
          await file.close()
        })
      }
      this.finish = done
      setTimeout(done, 1500)
    })
  }

  get written() {
    return this.file?.written ?? 0
  }

  /** Frame atual do relógio de áudio (para alinhar a voz com o vídeo do app nativo). */
  get frame() {
    return this.now()
  }

  private onChunk(frame: number, data: Float32Array) {
    this.onPcm?.(frame, data)
    const file = this.file
    if (!file) return
    const a = Math.max(this.from, frame)
    const b = Math.min(this.until, frame + data.length)
    if (b > a) {
      const pcm = new Int16Array(b - a)
      for (let i = 0; i < pcm.length; i++) {
        const v = Math.max(-1, Math.min(1, data[a - frame + i]))
        pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff
      }
      file.write(pcm.buffer)
      this.bytes += pcm.byteLength
    }
    if (frame + data.length >= this.until) this.finish?.()
  }

  disconnect() {
    this.node.disconnect()
  }
}
