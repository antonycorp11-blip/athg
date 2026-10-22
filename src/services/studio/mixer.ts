// Mixer do Modo Gravação: som do jogo (capturado da aba) + voz ao vivo do iPhone.
// - Gravação: o vídeo leva só o som do jogo (com o volume do mixer); a voz vai crua para
//   um WAV separado (ver wav.ts), para tratar o ruído no editor.
// - Retorno: jogo + voz, cada um com o volume do mixer, tocam numa janelinha separada
//   (o som direto da aba é cortado na captura). O som de outra janela não entra na
//   captura da aba, então não há eco nem voz vazando para a trilha do jogo.

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
  private monitorEl: HTMLAudioElement | null = null
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
      return { input, gain, analyser, source: null, volume: 1, muted: false, level: 0 }
    }
    this.channels = { game: make(), voice: make() }
    this.channels.game.gain.connect(this.recordDest)
    this.channels.game.gain.connect(this.monitorGain)
    this.channels.voice.gain.connect(this.monitorGain)
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

  /**
   * Abre (ou reaproveita) a janela de retorno. O Chrome só deixa uma janela tocar som
   * depois de um clique nela: se o play for bloqueado, a janela mostra o botão de ativar.
   */
  openMonitor(texts: { title: string; text: string; button: string; on: string }) {
    if (this.monitorWin && !this.monitorWin.closed) {
      this.monitorWin.focus()
      return true
    }
    const w = window.open('', 'athg-retorno', 'width=380,height=200')
    if (!w) return false
    const doc = w.document
    doc.title = texts.title
    doc.body.style.cssText =
      'margin:0;height:100vh;display:grid;place-items:center;background:#060b14;color:#f5f7fa;font:14px/1.5 system-ui,sans-serif;text-align:center'
    doc.body.innerHTML = `<div style="padding:16px"><b>${texts.title}</b><br><span id="s" style="color:#94a3b8">${texts.text}</span><br>
      <button id="go" style="margin-top:12px;padding:10px 18px;border:0;border-radius:10px;background:#1677ff;color:#fff;font:600 14px system-ui;cursor:pointer">${texts.button}</button></div>`
    const el = doc.createElement('audio')
    el.srcObject = this.monitorDest.stream
    doc.body.appendChild(el)
    const go = doc.getElementById('go')!
    const status = doc.getElementById('s')!
    const play = () =>
      el.play().then(
        () => {
          go.style.display = 'none'
          status.textContent = texts.on
        },
        () => void (go.style.display = 'inline-block'),
      )
    go.addEventListener('click', () => void play())
    void play()
    this.monitorWin = w
    this.monitorEl = el
    return true
  }

  /** 'off' = janela fechada; 'blocked' = aberta esperando o clique; 'on' = tocando. */
  get monitorState(): 'off' | 'blocked' | 'on' {
    if (!this.monitorWin || this.monitorWin.closed) return 'off'
    return this.monitorEl && !this.monitorEl.paused ? 'on' : 'blocked'
  }

  async resume() {
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => {})
  }

  close() {
    this.monitorWin?.close()
    void this.ctx.close().catch(() => {})
  }
}
