// Ajustes de SDP na resposta do estúdio: pedem ao iPhone vídeo com bitrate alto desde o
// início (sem a rampa lenta de qualidade do WebRTC) e voz Opus em alta qualidade.

const VIDEO_PARAMS = 'x-google-start-bitrate=4000;x-google-min-bitrate=1500;x-google-max-bitrate=8000'
const OPUS_PARAMS = 'maxaveragebitrate=128000;stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=0'

export function tuneAnswer(sdp: string) {
  const lines = sdp.split('\r\n')
  const payloads = new Map<string, 'video' | 'opus'>()
  for (const line of lines) {
    const m = /^a=rtpmap:(\d+) ([\w-]+)\//.exec(line)
    if (!m) continue
    const codec = m[2].toLowerCase()
    if (codec === 'opus') payloads.set(m[1], 'opus')
    else if (codec === 'h264' || codec === 'vp8' || codec === 'vp9' || codec === 'av1') payloads.set(m[1], 'video')
  }
  return lines
    .map((line) => {
      const m = /^a=fmtp:(\d+) (.*)$/.exec(line)
      const kind = m && payloads.get(m[1])
      if (!m || !kind) return line
      const extra = kind === 'opus' ? OPUS_PARAMS : VIDEO_PARAMS
      const keys = new Set(extra.split(';').map((p) => p.split('=')[0]))
      const kept = m[2].split(';').filter((p) => !keys.has(p.split('=')[0]))
      return `a=fmtp:${m[1]} ${[...kept, extra].join(';')}`
    })
    .join('\r\n')
}

/** Prefere H.264 (codificador de hardware do iPhone, decodificador de hardware do Mac). */
export function preferH264(transceiver: RTCRtpTransceiver) {
  try {
    const caps = RTCRtpSender.getCapabilities('video')
    if (!caps || typeof transceiver.setCodecPreferences !== 'function') return
    const rank = (mime: string) => (mime === 'video/H264' ? 0 : mime === 'video/VP8' ? 1 : 2)
    transceiver.setCodecPreferences([...caps.codecs].sort((a, b) => rank(a.mimeType) - rank(b.mimeType)))
  } catch {
    /* mantém a ordem padrão */
  }
}
