// ATHG Gravador — gravador de tela leve para Mac (macOS 13+), feito para Macs fracos.
//
// - Grava a tela inteira com ScreenCaptureKit e comprime no chip de vídeo (H.264 por
//   hardware, VideoToolbox), em 1080p. O jogo roda sozinho no navegador/app dele.
// - Rosto: janela flutuante com a câmera do iPhone (página /estudio-rosto da ATHG num
//   WKWebView, conectada pelo mesmo QR code do Modo Gravação). Arraste para mover, rodinha
//   para o tamanho. Ela aparece na gravação; o painel de controle não.
// - Cenas em ⌘1 / ⌘2 / ⌘3 em qualquer app (atalho global) e pelo iPhone.
// - Arquivos: "... - video.mp4" (tela + som dos apps, sem a voz) e "... - voz.wav"
//   (voz do iPhone, mesma duração do vídeo), em Filmes/ATHG Gravações.

import AppKit
import AVFoundation
import Carbon.HIToolbox
import CoreImage
import ScreenCaptureKit
import SwiftUI
import WebKit

let SITE = ProcessInfo.processInfo.environment["ATHG_URL"] ?? "https://athg.antonycorp11.workers.dev"
let VOICE_RATE = 48_000.0

let outputFolder: URL = {
  let movies = FileManager.default.urls(for: .moviesDirectory, in: .userDomainMask).first!
  let dir = movies.appendingPathComponent("ATHG Gravações", isDirectory: true)
  try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  return dir
}()

func takeName() -> String {
  let f = DateFormatter()
  f.dateFormat = "yyyy-MM-dd HH-mm-ss"
  return "Gravação \(f.string(from: Date()))"
}

func wavHeader(dataBytes: Int) -> Data {
  var d = Data()
  func u32(_ v: UInt32) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 4)) }
  func u16(_ v: UInt16) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 2)) }
  d.append("RIFF".data(using: .ascii)!); u32(UInt32(36 + dataBytes)); d.append("WAVE".data(using: .ascii)!)
  d.append("fmt ".data(using: .ascii)!); u32(16); u16(1); u16(1); u32(UInt32(VOICE_RATE)); u32(UInt32(VOICE_RATE) * 2); u16(2); u16(16)
  d.append("data".data(using: .ascii)!); u32(UInt32(dataBytes))
  return d
}

func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }

/** Registro simples em ~/Library/Application Support/ATHG Gravador/log.txt (para suporte). */
let supportFolder: URL = {
  let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!.appendingPathComponent("ATHG Gravador", isDirectory: true)
  try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  return dir
}()

func log(_ text: String) {
  let line = "\(Date()) \(text)\n"
  let url = supportFolder.appendingPathComponent("log.txt")
  if let h = try? FileHandle(forWritingTo: url) {
    h.seekToEndOfFile()
    h.write(line.data(using: .utf8)!)
    try? h.close()
  } else {
    try? line.data(using: .utf8)!.write(to: url)
  }
}

// MARK: - Voz: retorno no fone + voz.wav alinhado ao vídeo

final class Voice {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: VOICE_RATE, channels: 1, interleaved: false)!
  private var queued = 0
  private let q = DispatchQueue(label: "voice")
  var monitorOn = true
  var volume: Float = 1 { didSet { player.volume = volume } }
  private(set) var level: Float = 0

  private var file: FileHandle?
  private var fileURL: URL?
  private var startMs: Double?
  private var bytes = 0
  private var lastEndMs = 0.0

  init() {
    engine.attach(player)
    engine.connect(player, to: engine.mainMixerNode, format: format)
    try? engine.start()
    player.play()
  }

  /** Pedaço de PCM Int16 mono vindo da página do rosto; `endMs` = hora em que ele terminou. */
  func receive(pcm: Data, endMs: Double) {
    let count = pcm.count / 2
    guard count > 0 else { return }
    q.async { [self] in
      lastEndMs = endMs
      var peak: Int16 = 0
      pcm.withUnsafeBytes { raw in
        for s in raw.bindMemory(to: Int16.self) { peak = max(peak, s == .min ? .max : abs(s)) }
      }
      level = max(Float(peak) / 32768, level * 0.8)
      write(pcm: pcm, count: count, endMs: endMs)
      play(pcm: pcm, count: count)
    }
  }

  private func play(pcm: Data, count: Int) {
    guard monitorOn, queued < 4 else { return } // retorno com no máximo ~0,35 s de atraso
    guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(count)) else { return }
    buf.frameLength = AVAudioFrameCount(count)
    let out = buf.floatChannelData![0]
    pcm.withUnsafeBytes { raw in
      let s = raw.bindMemory(to: Int16.self)
      for i in 0..<count { out[i] = Float(s[i]) / 32768 }
    }
    queued += 1
    player.scheduleBuffer(buf) { [weak self] in self?.q.async { self?.queued -= 1 } }
    if !player.isPlaying { player.play() }
  }

  private func write(pcm: Data, count: Int, endMs: Double) {
    guard let file, let startMs else { return }
    let chunkStart = endMs - Double(count) / VOICE_RATE * 1000
    let skip = max(0, Int(((startMs - chunkStart) / 1000 * VOICE_RATE).rounded()))
    guard skip < count else { return }
    // Antes do primeiro pedaço, completa com silêncio até a hora em que o vídeo começou.
    if bytes == 0, chunkStart > startMs {
      let gap = Int(((chunkStart - startMs) / 1000 * VOICE_RATE).rounded()) * 2
      if gap > 0 { file.write(Data(count: gap)); bytes += gap }
    }
    let slice = pcm.subdata(in: (pcm.startIndex + skip * 2)..<pcm.endIndex)
    file.write(slice)
    bytes += slice.count
  }

  func begin(url: URL, startMs: Double) {
    q.sync {
      FileManager.default.createFile(atPath: url.path, contents: wavHeader(dataBytes: 0))
      file = try? FileHandle(forWritingTo: url)
      file?.seekToEndOfFile()
      fileURL = url
      self.startMs = startMs
      bytes = 0
    }
  }

  var written: Int { q.sync { bytes } }

  /** Fecha o WAV com exatamente `seconds` (corta ou completa com silêncio). */
  func finish(seconds: Double, done: @escaping (URL?) -> Void) {
    let target = Int((seconds * VOICE_RATE).rounded()) * 2
    let deadline = Date().addingTimeInterval(1.5)
    func attempt() {
      q.async { [self] in
        if let startMs, bytes < target, lastEndMs < startMs + seconds * 1000, Date() < deadline {
          DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) { attempt() }
          return
        }
        guard let file, let url = fileURL else { return done(nil) }
        if bytes < target { file.write(Data(count: target - bytes)) }
        file.truncateFile(atOffset: UInt64(44 + target))
        file.seek(toFileOffset: 0)
        file.write(wavHeader(dataBytes: target))
        try? file.close()
        self.file = nil
        self.fileURL = nil
        self.startMs = nil
        done(url)
      }
    }
    attempt()
  }
}

// MARK: - Tela + som dos apps → MP4 (H.264 por hardware + AAC)

final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate {
  private var stream: SCStream?
  private var writer: AVAssetWriter?
  private var vIn: AVAssetWriterInput?
  private var aIn: AVAssetWriterInput?
  private var firstPTS: CMTime = .invalid
  private let q = DispatchQueue(label: "rec")
  private(set) var url: URL?
  private var peak: Float = 0
  private(set) var level: Float = 0
  var gain: Float = 1
  var onFirstFrame: ((Double) -> Void)?
  var onError: ((String) -> Void)?

  var recording: Bool { q.sync { writer != nil } }
  var seconds: Double {
    q.sync { firstPTS.isValid ? CMTimeGetSeconds(CMClockGetTime(CMClockGetHostTimeClock()) - firstPTS) : 0 }
  }
  var bytes: Int {
    guard let url, let size = try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int else { return 0 }
    return size
  }

  /** Liga a captura (sem gravar): o Gravar começa na hora e os medidores já funcionam. */
  func arm(excluding windowIDs: [CGWindowID], width: Int, height: Int, crop: Bool) async throws {
    try? await stream?.stopCapture()
    stream = nil
    let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
    guard let display = content.displays.first(where: { $0.displayID == CGMainDisplayID() }) ?? content.displays.first else { return }
    let hidden = content.windows.filter { windowIDs.contains($0.windowID) }
    let filter = SCContentFilter(display: display, excludingWindows: hidden)
    let cfg = SCStreamConfiguration()
    cfg.width = width
    cfg.height = height
    let w = CGFloat(display.width), h = CGFloat(display.height)
    if crop, w / h > 16.0 / 9.0 + 0.01 {
      let cw = h * 16 / 9
      cfg.sourceRect = CGRect(x: (w - cw) / 2, y: 0, width: cw, height: h)
    } else if crop, w / h < 16.0 / 9.0 - 0.01 {
      let ch = w * 9 / 16
      cfg.sourceRect = CGRect(x: 0, y: (h - ch) / 2, width: w, height: ch)
    }
    cfg.scalesToFit = true
    cfg.minimumFrameInterval = CMTime(value: 1, timescale: 30)
    cfg.pixelFormat = kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
    cfg.showsCursor = true
    cfg.queueDepth = 8
    cfg.capturesAudio = true
    cfg.sampleRate = 48_000
    cfg.channelCount = 2
    // O retorno da voz toca por este app: não entra na trilha do vídeo.
    cfg.excludesCurrentProcessAudio = true
    let s = SCStream(filter: filter, configuration: cfg, delegate: self)
    try s.addStreamOutput(self, type: .screen, sampleHandlerQueue: q)
    try s.addStreamOutput(self, type: .audio, sampleHandlerQueue: q)
    try await s.startCapture()
    stream = s
  }

  func start(url: URL, width: Int, height: Int) throws {
    let w = try AVAssetWriter(outputURL: url, fileType: .mp4)
    // Fragmentos a cada 10 s: se algo travar no meio, o que já foi gravado continua tocando.
    w.movieFragmentInterval = CMTime(seconds: 10, preferredTimescale: 600)
    let v = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: width,
      AVVideoHeightKey: height,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: height >= 1080 ? 14_000_000 : 8_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: 30,
        AVVideoMaxKeyFrameIntervalKey: 60,
        AVVideoAllowFrameReorderingKey: false,
      ],
    ])
    v.expectsMediaDataInRealTime = true
    let a = AVAssetWriterInput(mediaType: .audio, outputSettings: [
      AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48_000, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 192_000,
    ])
    a.expectsMediaDataInRealTime = true
    w.add(v)
    w.add(a)
    guard w.startWriting() else { throw NSError(domain: "athg", code: 1, userInfo: [NSLocalizedDescriptionKey: w.error?.localizedDescription ?? "startWriting"]) }
    q.sync {
      writer = w
      vIn = v
      aIn = a
      firstPTS = .invalid
      self.url = url
    }
  }

  func stream(_ stream: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
    guard sb.isValid else { return }
    let pts = CMSampleBufferGetPresentationTimeStamp(sb)
    switch type {
    case .screen:
      guard let writer, writer.status == .writing else { return }
      guard
        let attachments = CMSampleBufferGetSampleAttachmentsArray(sb, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
        let raw = attachments.first?[.status] as? Int,
        SCFrameStatus(rawValue: raw) == .complete
      else { return }
      if !firstPTS.isValid {
        firstPTS = pts
        writer.startSession(atSourceTime: pts)
        // Hora (relógio de parede) do primeiro quadro: a voz começa exatamente aqui.
        let age = CMTimeGetSeconds(CMClockGetTime(CMClockGetHostTimeClock()) - pts)
        let startMs = nowMs() - age * 1000
        DispatchQueue.main.async { self.onFirstFrame?(startMs) }
      }
      if vIn?.isReadyForMoreMediaData == true { vIn?.append(sb) }
    case .audio:
      applyGainAndMeasure(sb)
      guard let writer, writer.status == .writing, firstPTS.isValid, pts >= firstPTS, aIn?.isReadyForMoreMediaData == true else { return }
      aIn?.append(sb)
    @unknown default:
      break
    }
  }

  /** Volume do jogo na gravação + nível para o medidor. */
  private func applyGainAndMeasure(_ sb: CMSampleBuffer) {
    var size = 0
    CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(sb, bufferListSizeNeededOut: &size, bufferListOut: nil, bufferListSize: 0,
      blockBufferAllocator: nil, blockBufferMemoryAllocator: nil, flags: 0, blockBufferOut: nil)
    let listPtr = UnsafeMutableRawPointer.allocate(byteCount: size, alignment: 16)
    defer { listPtr.deallocate() }
    let list = listPtr.bindMemory(to: AudioBufferList.self, capacity: 1)
    var block: CMBlockBuffer?
    guard CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(sb, bufferListSizeNeededOut: nil, bufferListOut: list, bufferListSize: size,
      blockBufferAllocator: nil, blockBufferMemoryAllocator: nil, flags: 0, blockBufferOut: &block) == noErr else { return }
    let g = gain
    for buffer in UnsafeMutableAudioBufferListPointer(list) {
      guard let data = buffer.mData else { continue }
      let n = Int(buffer.mDataByteSize) / 4
      let f = data.bindMemory(to: Float.self, capacity: n)
      for i in 0..<n {
        if g != 1 { f[i] *= g }
        peak = max(peak, abs(f[i]))
      }
    }
    level = max(peak, level * 0.8)
    peak = 0
  }

  func stream(_ stream: SCStream, didStopWithError error: Error) {
    DispatchQueue.main.async { self.onError?(error.localizedDescription) }
  }

  /** Para de gravar (a captura continua ligada). Devolve o arquivo e a duração exata. */
  func stop() async -> (URL?, Double) {
    let end = CMClockGetTime(CMClockGetHostTimeClock())
    let (w, v, a, first, url): (AVAssetWriter?, AVAssetWriterInput?, AVAssetWriterInput?, CMTime, URL?) = q.sync {
      let r = (writer, vIn, aIn, firstPTS, self.url)
      writer = nil
      vIn = nil
      aIn = nil
      firstPTS = .invalid
      return r
    }
    guard let w else { return (nil, 0) }
    guard first.isValid else {
      w.cancelWriting()
      return (nil, 0)
    }
    v?.markAsFinished()
    a?.markAsFinished()
    w.endSession(atSourceTime: end)
    await w.finishWriting()
    return (url, CMTimeGetSeconds(end - first))
  }
}

// MARK: - Estado do estúdio

enum Scene: Int, CaseIterable, Identifiable {
  case face = 1, gameFace = 2, game = 3
  var id: Int { rawValue }
  var key: String { ["", "face", "game-face", "game"][rawValue] }
  var label: String { ["", "Rosto", "Jogo + rosto", "Só jogo"][rawValue] }
  static func from(_ key: String) -> Scene? { allCases.first { $0.key == key } }
}

final class Studio: NSObject, ObservableObject, WKScriptMessageHandler {
  let recorder = Recorder()
  let voice = Voice()
  let defaults = UserDefaults.standard

  @Published var scene: Scene = .gameFace { didSet { layoutFace(animated: true); syncFace() } }
  @Published var shape: String = "wide" { didSet { defaults.set(shape, forKey: "shape"); layoutFace(animated: true); syncFace() } }
  @Published var mirror = true { didSet { defaults.set(mirror, forKey: "mirror"); syncFace() } }
  @Published var rotate = 0 { didSet { defaults.set(rotate, forKey: "rotate"); syncFace() } }
  @Published var gameVol: Double = 1 { didSet { recorder.gain = Float(gameVol); defaults.set(gameVol, forKey: "gameVol") } }
  @Published var voiceVol: Double = 1 { didSet { voice.volume = Float(voiceVol); defaults.set(voiceVol, forKey: "voiceVol") } }
  @Published var monitorOn = true { didSet { voice.monitorOn = monitorOn; defaults.set(monitorOn, forKey: "monitorOn") } }
  @Published var hd = true { didSet { defaults.set(hd, forKey: "hd"); rearm() } }
  @Published var crop = false { didSet { defaults.set(crop, forKey: "crop"); rearm() } }
  @Published var recording = false
  @Published var seconds: Double = 0
  @Published var sizeText = ""
  @Published var gameLevel: Float = 0
  @Published var voiceLevel: Float = 0
  @Published var phone = "Aguardando o iPhone"
  @Published var phoneOK = false
  @Published var noise: Bool? = nil
  @Published var roomURL = ""
  @Published var showQR = false
  @Published var message = "" { didSet { if !message.isEmpty { log(message) } } }
  @Published var armed = false

  var face: NSPanel!
  var web: WKWebView!
  var panel: NSPanel!
  private var faceFrame: NSRect?
  private var timer: Timer?
  private var take: (video: URL, voice: URL)?

  override init() {
    super.init()
    shape = defaults.string(forKey: "shape") ?? "wide"
    mirror = defaults.object(forKey: "mirror") as? Bool ?? true
    rotate = defaults.integer(forKey: "rotate")
    gameVol = defaults.object(forKey: "gameVol") as? Double ?? 1
    voiceVol = defaults.object(forKey: "voiceVol") as? Double ?? 1
    monitorOn = defaults.object(forKey: "monitorOn") as? Bool ?? true
    hd = defaults.object(forKey: "hd") as? Bool ?? true
    crop = defaults.object(forKey: "crop") as? Bool ?? false
    if let s = defaults.string(forKey: "faceFrame") { faceFrame = NSRectFromString(s) }
    recorder.onFirstFrame = { [weak self] startMs in
      guard let self, let take = self.take else { return }
      self.voice.begin(url: take.voice, startMs: startMs)
    }
    recorder.onError = { [weak self] msg in self?.message = "Captura parou: \(msg)" }
    timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.tick() }
  }

  var outputSize: (Int, Int) {
    let screen = NSScreen.main?.frame.size ?? CGSize(width: 1440, height: 900)
    let h = hd ? 1080 : 720
    let aspect = crop ? 16.0 / 9.0 : screen.width / screen.height
    let w = Int((Double(h) * aspect / 2).rounded()) * 2
    return (w, h)
  }

  private var ticks = 0
  private func tick() {
    gameLevel = recorder.level
    voiceLevel = voice.level
    ticks += 1
    if recording, ticks % 10 == 0 {
      seconds = recorder.seconds
      let mb = Double(recorder.bytes + voice.written) / 1_048_576
      sizeText = mb >= 1024 ? String(format: "%.1f GB", mb / 1024) : String(format: "%.0f MB", mb)
    }
  }

  // MARK: captura

  func rearm() {
    // Sem confiar só no CGPreflight (ele erra com apps assinados localmente): tenta capturar.
    guard panel != nil, !recording else { return }
    let (w, h) = outputSize
    let hidden = [CGWindowID(panel.windowNumber)]
    Task { @MainActor in
      do {
        try await recorder.arm(excluding: hidden, width: w, height: h, crop: crop)
        armed = true
        message = "Pronto: \(w)×\(h), chip de vídeo."
      } catch {
        armed = false
        message = "Sem permissão de gravação de tela. Em Ajustes do Sistema › Privacidade e Segurança › Gravação de Tela, remova o ATHG Gravador (botão −), abra o app de novo e autorize. (\(error.localizedDescription))"
        _ = CGRequestScreenCaptureAccess()
      }
    }
  }

  func toggleRec() { recording ? stopRec() : startRec() }

  func startRec() {
    guard armed, !recording else {
      if !armed { rearm() }
      return
    }
    let base = takeName()
    let video = outputFolder.appendingPathComponent("\(base) - video.mp4")
    let wav = outputFolder.appendingPathComponent("\(base) - voz.wav")
    let (w, h) = outputSize
    do {
      take = (video, wav)
      try recorder.start(url: video, width: w, height: h)
      recording = true
      seconds = 0
      sizeText = ""
      message = "Gravando \(w)×\(h)…"
      syncFace()
    } catch {
      take = nil
      message = "Não deu para gravar: \(error.localizedDescription)"
    }
  }

  func stopRec() {
    guard recording else { return }
    recording = false
    syncFace()
    Task { @MainActor in
      let (url, secs) = await recorder.stop()
      voice.finish(seconds: secs) { [weak self] _ in
        DispatchQueue.main.async {
          self?.message = url.map { "Salvo em Filmes › ATHG Gravações: \($0.lastPathComponent)" } ?? "Nada foi gravado."
        }
      }
      take = nil
      log("gravação: \(url?.lastPathComponent ?? "-") \(String(format: "%.2f", secs)) s")
    }
  }

  // MARK: janela do rosto

  func defaultFaceFrame() -> NSRect {
    let s = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
    let w = s.width * 0.24
    let h = shape == "wide" ? w * 9 / 16 : w
    return NSRect(x: s.maxX - w - 24, y: s.minY + 24, width: w, height: h)
  }

  func layoutFace(animated: Bool) {
    guard let face else { return }
    let screen = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
    var frame = faceFrame ?? defaultFaceFrame()
    // forma mudou: mantém a largura e ajusta a altura
    frame.size.height = shape == "wide" ? frame.width * 9 / 16 : frame.width
    switch scene {
    case .face:
      face.ignoresMouseEvents = true
      face.alphaValue = 1
      setFace(screen, animated: animated)
    case .gameFace:
      face.ignoresMouseEvents = false
      face.alphaValue = 1
      setFace(frame, animated: animated)
    case .game:
      // Transparente (e não escondida): o navegador do rosto continua recebendo a voz.
      face.ignoresMouseEvents = true
      setFace(frame, animated: false)
      face.alphaValue = 0
    }
  }

  private func setFace(_ frame: NSRect, animated: Bool) {
    if animated {
      NSAnimationContext.runAnimationGroup { ctx in
        ctx.duration = 0.25
        face.animator().setFrame(frame, display: true)
      }
    } else {
      face.setFrame(frame, display: true)
    }
  }

  private func moveFace(dx: Double, dy: Double) {
    guard scene == .gameFace else { return }
    var f = face.frame
    f.origin.x += dx
    f.origin.y -= dy
    faceFrame = f
    face.setFrame(f, display: true)
    defaults.set(NSStringFromRect(f), forKey: "faceFrame")
  }

  private func resizeFace(dy: Double) {
    guard scene == .gameFace else { return }
    let screen = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
    var f = face.frame
    let w = min(screen.width * 0.6, max(screen.width * 0.1, f.width * (1 - dy * 0.002)))
    let h = shape == "wide" ? w * 9 / 16 : w
    f = NSRect(x: f.midX - w / 2, y: f.midY - h / 2, width: w, height: h)
    faceFrame = f
    face.setFrame(f, display: true)
    defaults.set(NSStringFromRect(f), forKey: "faceFrame")
  }

  func syncFace() {
    guard let web else { return }
    let started = recording ? (nowMs() - seconds * 1000) : 0
    let js = "window.athgFace && window.athgFace.set({scene:'\(scene.key)',shape:'\(shape)',mirror:\(mirror),rotate:\(rotate),recording:\(recording),startedAt:\(recording ? String(Int(started)) : "null")})"
    web.evaluateJavaScript(js)
  }

  func setNoise(_ on: Bool) { web?.evaluateJavaScript("window.athgFace && window.athgFace.noise(\(on))") }

  // Mensagens da página do rosto
  func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
    guard let m = message.body as? [String: Any], let type = m["type"] as? String else { return }
    switch type {
    case "room":
      roomURL = m["url"] as? String ?? ""
      try? roomURL.write(to: supportFolder.appendingPathComponent("room.txt"), atomically: true, encoding: .utf8)
      log("sala \(roomURL)")
      syncFace()
    case "link":
      let camera = m["camera"] as? Bool ?? false
      let status = m["status"] as? String ?? ""
      phoneOK = camera && status != "waiting"
      phone = phoneOK ? "iPhone conectado" : status == "connecting" ? "Conectando o iPhone…" : "Aguardando o iPhone"
      log("iPhone: \(status) câmera=\(camera)")
      if phoneOK { showQR = false }
      syncFace()
    case "pcm":
      if let b64 = m["data"] as? String, let data = Data(base64Encoded: b64), let end = m["end"] as? Double { voice.receive(pcm: data, endMs: end) }
    case "drag":
      moveFace(dx: m["dx"] as? Double ?? 0, dy: m["dy"] as? Double ?? 0)
    case "resize":
      resizeFace(dy: m["dy"] as? Double ?? 0)
    case "ctl":
      guard let msg = m["msg"] as? [String: Any], let t = msg["t"] as? String else { return }
      if t == "scene", let s = msg["scene"] as? String, let sc = Scene.from(s) { scene = sc }
      if t == "rec-toggle" { toggleRec() }
      if t == "cam-transform" {
        if let mi = msg["mirror"] as? Bool { mirror = mi }
        if let r = msg["rotate"] as? Int { rotate = r }
      }
      if t == "cam-info", let n = msg["noise"] as? Bool { noise = n }
    default:
      break
    }
  }
}

// MARK: - Painel (não aparece na gravação)

struct Meter: View {
  var level: Float
  var body: some View {
    let db = level > 0 ? max(0, min(1, (20 * log10(Double(level)) + 60) / 60)) : 0
    GeometryReader { g in
      ZStack(alignment: .leading) {
        Capsule().fill(Color.white.opacity(0.1))
        Capsule().fill(level > 0.89 ? Color.red : level > 0.5 ? Color.yellow : Color.green).frame(width: g.size.width * db)
      }
    }
    .frame(height: 6)
  }
}

struct PanelView: View {
  @ObservedObject var s: Studio

  func qr(_ text: String) -> NSImage? {
    guard let f = CIFilter(name: "CIQRCodeGenerator") else { return nil }
    f.setValue(text.data(using: .utf8), forKey: "inputMessage")
    f.setValue("M", forKey: "inputCorrectionLevel")
    guard let out = f.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8)) else { return nil }
    let rep = NSCIImageRep(ciImage: out)
    let img = NSImage(size: rep.size)
    img.addRepresentation(rep)
    return img
  }

  var time: String {
    let t = Int(s.seconds)
    return t >= 3600 ? String(format: "%d:%02d:%02d", t / 3600, t / 60 % 60, t % 60) : String(format: "%02d:%02d", t / 60, t % 60)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Group {
      HStack {
        Circle().fill(s.phoneOK ? Color.green : Color.orange).frame(width: 8, height: 8)
        Text(s.phone).font(.caption)
        Spacer()
        Button(s.showQR ? "Fechar" : "Conectar iPhone") { s.showQR.toggle() }.controlSize(.small)
      }
      if s.showQR, !s.roomURL.isEmpty {
        VStack(spacing: 4) {
          if let img = qr(s.roomURL) { Image(nsImage: img).interpolation(.none).resizable().frame(width: 170, height: 170).background(Color.white) }
          Text("Aponte a câmera do iPhone (mesmo Wi-Fi)").font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
      }

      }
      Group {
      Text("Cena  (⌘1 ⌘2 ⌘3 em qualquer app)").font(.caption2).foregroundColor(.secondary)
      HStack(spacing: 6) {
        ForEach(Scene.allCases) { sc in
          Button("\(sc.rawValue) \(sc.label)") { s.scene = sc }
            .controlSize(.small)
            .buttonStyle(.borderedProminent)
            .tint(s.scene == sc ? .blue : .gray.opacity(0.4))
        }
      }

      HStack(spacing: 8) {
        Picker("", selection: $s.shape) {
          Text("▭").tag("wide")
          Text("□").tag("square")
          Text("○").tag("circle")
        }
        .pickerStyle(.segmented)
        .frame(width: 110)
        Toggle("Espelhar", isOn: $s.mirror).controlSize(.small)
        Button("Girar \(s.rotate)°") { s.rotate = (s.rotate + 90) % 360 }.controlSize(.small)
      }
      Text("Arraste o rosto para mover; rodinha do mouse muda o tamanho.").font(.caption2).foregroundColor(.secondary)

      }
      Group {
      Divider()
      VStack(alignment: .leading, spacing: 4) {
        Text("Som dos apps (jogo) — volume na gravação").font(.caption)
        HStack { Slider(value: $s.gameVol, in: 0...2).controlSize(.small); Text("\(Int(s.gameVol * 100))%").font(.caption2).frame(width: 36) }
        Meter(level: s.gameLevel)
      }
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text("Voz do iPhone — retorno no fone").font(.caption)
          Spacer()
          Toggle("Ouvir", isOn: $s.monitorOn).controlSize(.small)
        }
        HStack { Slider(value: $s.voiceVol, in: 0...1.5).controlSize(.small); Text("\(Int(s.voiceVol * 100))%").font(.caption2).frame(width: 36) }
        Meter(level: s.voiceLevel)
        if let n = s.noise {
          Toggle("Redução de ruído do iPhone", isOn: Binding(get: { n }, set: { s.setNoise($0) })).controlSize(.small)
        }
      }
      Text("O vídeo sai só com o som dos apps; a voz vai separada (voz.wav, mesma duração).").font(.caption2).foregroundColor(.secondary)

      }
      Group {
      Divider()
      HStack {
        Picker("", selection: $s.hd) { Text("1080p").tag(true); Text("720p").tag(false) }
          .pickerStyle(.segmented).frame(width: 130).disabled(s.recording)
        Toggle("Cortar 16:9", isOn: $s.crop).controlSize(.small).disabled(s.recording)
      }
      HStack {
        Button(action: s.toggleRec) {
          Text(s.recording ? "■ Parar  \(time)" : "● Gravar").font(.headline).frame(minWidth: 120)
        }
        .buttonStyle(.borderedProminent)
        .tint(s.recording ? .gray : .red)
        .disabled(!s.armed && !s.recording)
        if s.recording { Text(s.sizeText).font(.caption).foregroundColor(.secondary) }
        Spacer()
        Button("Pasta") { NSWorkspace.shared.open(outputFolder) }.controlSize(.small)
      }
      if !s.message.isEmpty { Text(s.message).font(.caption2).foregroundColor(.secondary).fixedSize(horizontal: false, vertical: true) }
      }
    }
    .padding(12)
    .frame(width: 340)
  }
}

// MARK: - Atalhos globais ⌘1 / ⌘2 / ⌘3

var hotkeyStudio: Studio?

func registerHotkeys() {
  var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
  InstallEventHandler(GetApplicationEventTarget(), { _, event, _ in
    var id = EventHotKeyID()
    GetEventParameter(event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil, MemoryLayout<EventHotKeyID>.size, nil, &id)
    DispatchQueue.main.async { if let sc = Scene(rawValue: Int(id.id)) { hotkeyStudio?.scene = sc } }
    return noErr
  }, 1, &spec, nil, nil)
  let keys = [kVK_ANSI_1, kVK_ANSI_2, kVK_ANSI_3]
  for (i, key) in keys.enumerated() {
    var ref: EventHotKeyRef?
    RegisterEventHotKey(UInt32(key), UInt32(cmdKey), EventHotKeyID(signature: OSType(0x4154_4847), id: UInt32(i + 1)), GetApplicationEventTarget(), 0, &ref)
  }
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
  let studio = Studio()
  var item: NSStatusItem!

  func applicationDidFinishLaunching(_ notification: Notification) {
    hotkeyStudio = studio
    registerHotkeys()
    let behavior: NSWindow.CollectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]

    // Rosto
    let cfg = WKWebViewConfiguration()
    cfg.mediaTypesRequiringUserActionForPlayback = []
    cfg.userContentController.add(studio, name: "athg")
    let face = NSPanel(contentRect: studio.defaultFaceFrame(), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    face.isOpaque = false
    face.backgroundColor = .clear
    face.hasShadow = false
    face.level = .statusBar
    face.collectionBehavior = behavior
    face.isFloatingPanel = true
    let web = WKWebView(frame: face.contentView!.bounds, configuration: cfg)
    web.autoresizingMask = [.width, .height]
    web.setValue(false, forKey: "drawsBackground")
    face.contentView!.addSubview(web)
    web.load(URLRequest(url: URL(string: "\(SITE)/estudio-rosto")!))
    face.orderFrontRegardless()
    studio.face = face
    studio.web = web

    // Painel de controle
    let panel = NSPanel(contentRect: NSRect(x: 40, y: 120, width: 340, height: 560),
                        styleMask: [.titled, .closable, .utilityWindow, .hudWindow, .nonactivatingPanel], backing: .buffered, defer: false)
    panel.title = "ATHG Gravador"
    panel.level = .statusBar
    panel.collectionBehavior = behavior
    panel.isFloatingPanel = true
    panel.hidesOnDeactivate = false
    panel.isReleasedWhenClosed = false
    panel.contentView = NSHostingView(rootView: PanelView(s: studio))
    panel.setFrameAutosaveName("ATHGGravadorPainel")
    panel.orderFrontRegardless()
    studio.panel = panel
    studio.layoutFace(animated: false)

    // Barra de menus
    item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    item.button?.title = "◉ ATHG"
    let menu = NSMenu()
    menu.addItem(NSMenuItem(title: "Mostrar painel", action: #selector(showPanel), keyEquivalent: ""))
    menu.addItem(NSMenuItem(title: "Abrir pasta das gravações", action: #selector(openFolder), keyEquivalent: ""))
    menu.addItem(.separator())
    menu.addItem(NSMenuItem(title: "Sair", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
    for m in menu.items where m.action != #selector(NSApplication.terminate(_:)) { m.target = self }
    item.menu = menu

    studio.rearm()
    Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
      self?.item.button?.title = self?.studio.recording == true ? "● REC" : "◉ ATHG"
    }
  }

  @objc func showPanel() { studio.panel.orderFrontRegardless() }
  @objc func openFolder() { NSWorkspace.shared.open(outputFolder) }
  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
  func applicationWillTerminate(_ notification: Notification) {
    if studio.recording { studio.stopRec(); Thread.sleep(forTimeInterval: 1.5) }
  }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
