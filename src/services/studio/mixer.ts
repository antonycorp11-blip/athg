// Mixer do Modo Gravação: som do jogo (capturado da aba) + voz ao vivo do iPhone.
// - Gravação: o vídeo leva só o som do jogo (com o volume do mixer); a voz vai crua para
//   um WAV separado (ver wav.ts), para tratar o ruído no editor.
// - Retorno: a mistura dos dois toca numa janelinha separada. O som de outra janela não
//   entra na captura da aba, então não há eco nem som duplicado na gravação.

export type MixChannel = 'game' | 'voice'

interface Channel {
  input: GainNode
  gain: GainNode
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode | null
  volume: number
  muted: boolean
  level: number
}

const METER_DECAY = 0.86

export class StudioMixer {
  readonly ctx: AudioContext
  private channels: Record<MixChannel, Channel>
  private recordDest: MediaStreamAudioDestinationNode
  private monitorGain: GainNode
  private monitorDest: MediaStreamAudioDestinationNode
  private monitorWin: Window | null = null
  private buffer = new Float32Array(1024)
  private sampledAt = 0

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48_000 })
    this.recordDest = this.ctx.createMediaStreamDestination()
    this.monitorGain = this.ctx.createGain()
    this.monitorDest = this.ctx.createMediaStreamDestination()
    this.monitorGain.connect(this.monitorDest)
    const make = (): Channel => {
      const input = this.ctx.createGain()
      const gain = this.ctx.createGain()
      const analyser = this.ctx.createAnalyser()
      analyser.fftSize = 1024
      input.connect(gain)
      gain.connect(analyser)
      gain.connect(this.monitorGain)
      return { input, gain, analyser, source: null, volume: 1, muted: false, level: 0 }
    }
    this.channels = { game: make(), voice: make() }
    this.channels.game.gain.connect(this.recordDest)
  }

  /** Voz antes do volume do mixer: é o que vai para o arquivo separado. */
  get voiceInput(): AudioNode {
    return this.channels.voice.input
  }

  /** Trilha de áudio que vai para o arquivo de vídeo (só o jogo). */
  get recordTrack() {
    return this.recordDest.stream.getAudioTracks()[0]
  }

  setStream(ch: MixChannel, stream: MediaStream | null) {
    const c = this.channels[ch]
    c.source?.disconnect()
    c.source = null
    if (stream?.getAudioTracks().length) {
      c.source = this.ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()))
      c.source.connect(c.input)
    }
  }

  hasInput(ch: MixChannel) {
    return Boolean(this.channels[ch].source)
  }

  setVolume(ch: MixChannel, volume: number, muted: boolean) {
    const c = this.channels[ch]
    c.volume = volume
    c.muted = muted
    c.gain.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.02)
  }

  setMonitorVolume(volume: number) {
    this.monitorGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02)
  }

  /** Nível de pico (0–1, com queda suave) de cada canal depois do volume. */
  level(ch: MixChannel) {
    const now = performance.now()
    if (now - this.sampledAt > 12) {
      this.sampledAt = now
      for (const c of Object.values(this.channels)) {
        c.analyser.getFloatTimeDomainData(this.buffer)
        let peak = 0
        for (const v of this.buffer) peak = Math.max(peak, Math.abs(v))
        c.level = Math.max(peak, c.level * METER_DECAY)
      }
    }
    return this.channels[ch].level
  }

  /** Abre (ou reaproveita) a janela de retorno. Precisa vir de um clique. */
  openMonitor(title: string, text: string) {
    if (this.monitorWin && !this.monitorWin.closed) {
      this.monitorWin.focus()
      return true
    }
    const w = window.open('', 'athg-retorno', 'width=380,height=170')
    if (!w) return false
    w.document.title = title
    w.document.body.style.cssText =
      'margin:0;height:100vh;display:grid;place-items:center;background:#060b14;color:#f5f7fa;font:14px/1.5 system-ui,sans-serif;text-align:center'
    w.document.body.innerHTML = `<div style="padding:16px"><b>${title}</b><br><span style="color:#94a3b8">${text}</span></div>`
    const el = w.document.createElement('audio')
    el.autoplay = true
    el.srcObject = this.monitorDest.stream
    w.document.body.appendChild(el)
    void el.play().catch(() => {})
    this.monitorWin = w
    return true
  }

  get monitorOpen() {
    return Boolean(this.monitorWin && !this.monitorWin.closed)
  }

  async resume() {
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => {})
  }

  close() {
    this.monitorWin?.close()
    void this.ctx.close().catch(() => {})
  }
}
