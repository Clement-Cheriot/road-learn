//
//  SherpaTTSPlugin.swift
//  Plugin TTS Kokoro - Pipeline avec timestamps
//  FILTRE XCODE: "chrono:"
//

import Foundation
import Capacitor
import AVFoundation

@objc(SherpaTTSPlugin)
public class SherpaTTSPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SherpaTTSPlugin"
    public let jsName = "SherpaTTS"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isInitialized", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pregenerate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speakCached", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearCache", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isCached", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resetTimer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logEvent", returnType: CAPPluginReturnPromise)
    ]
    
    private static var sharedTts: OpaquePointer?
    private static var sharedSampleRate: Int32 = 24000
    private static var isInitializing = false
    private static let frenchSpeakerId: Int32 = 30
    
    private static var audioCache: [String: Data] = [:]
    private static var textForKey: [String: String] = [:]
    private static let cacheQueue = DispatchQueue(label: "tts.cache", attributes: .concurrent)
    private static let generationQueue = DispatchQueue(label: "tts.gen", qos: .userInitiated, attributes: .concurrent)
    private static let generationSemaphore = DispatchSemaphore(value: 2)
    
    private var audioPlayer: AVAudioPlayer?
    private var pendingCall: CAPPluginCall?
    private static var isSpeaking = false
    private var currentPlayingKey: String?
    private static var audioSessionReady = false
    
    // Timer global
    private static var startTime: CFAbsoluteTime = 0
    
    private func t() -> String {
        let elapsed = CFAbsoluteTimeGetCurrent() - SherpaTTSPlugin.startTime
        return String(format: "%05.1f", elapsed)
    }
    
    @objc func initialize(_ call: CAPPluginCall) {
        if SherpaTTSPlugin.sharedTts != nil {
            call.resolve(["success": true, "sampleRate": SherpaTTSPlugin.sharedSampleRate])
            return
        }
        if SherpaTTSPlugin.isInitializing {
            call.resolve(["success": true, "sampleRate": SherpaTTSPlugin.sharedSampleRate])
            return
        }
        SherpaTTSPlugin.isInitializing = true
        SherpaTTSPlugin.startTime = CFAbsoluteTimeGetCurrent()
        
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true)
            SherpaTTSPlugin.audioSessionReady = true
        } catch {}
        

        
        guard let modelPath = findResource("model", ext: "onnx"),
              let voicesPath = findResource("voices", ext: "bin"),
              let tokensPath = findResource("tokens", ext: "txt"),
              let dataDir = findDataDir() else {
            SherpaTTSPlugin.isInitializing = false
            print("chrono: \(t()) ❌ INIT_FAIL - model:\(findResource("model", ext: "onnx") ?? "nil") voices:\(findResource("voices", ext: "bin") ?? "nil") tokens:\(findResource("tokens", ext: "txt") ?? "nil") dataDir:\(findDataDir() ?? "nil")")
            call.reject("Model not found")
            return
        }
        
        var config = createConfig(modelPath: modelPath, voicesPath: voicesPath, tokensPath: tokensPath, dataDir: dataDir)
        SherpaTTSPlugin.sharedTts = SherpaOnnxCreateOfflineTts(&config)
        
        guard SherpaTTSPlugin.sharedTts != nil else {
            SherpaTTSPlugin.isInitializing = false
            print("chrono: \(t()) ❌ INIT_FAIL")
            call.reject("TTS init failed")
            return
        }
        
        SherpaTTSPlugin.sharedSampleRate = SherpaOnnxOfflineTtsSampleRate(SherpaTTSPlugin.sharedTts)
        SherpaTTSPlugin.isInitializing = false
        print("chrono: \(t()) ✅ INIT")
        call.resolve(["success": true, "sampleRate": SherpaTTSPlugin.sharedSampleRate])
    }
    
    @objc func pregenerate(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty,
              let cacheKey = call.getString("cacheKey"), !cacheKey.isEmpty,
              let tts = SherpaTTSPlugin.sharedTts else {
            call.resolve(["success": false])
            return
        }
        
        var cached = false
        SherpaTTSPlugin.cacheQueue.sync { cached = SherpaTTSPlugin.audioCache[cacheKey] != nil }
        if cached {
            call.resolve(["success": true, "cached": true, "cacheKey": cacheKey])
            return
        }
        
        let speed = call.getFloat("speed") ?? 1.0
        
        print("chrono: \(t()) ⏳ GEN \(cacheKey)")
        let genStartTime = CFAbsoluteTimeGetCurrent()
        
        SherpaTTSPlugin.generationQueue.async {
            SherpaTTSPlugin.generationSemaphore.wait()
            defer { SherpaTTSPlugin.generationSemaphore.signal() }
            
            guard let audio = SherpaOnnxOfflineTtsGenerate(tts, text, SherpaTTSPlugin.frenchSpeakerId, speed),
                  let wavData = self.createWavData(audio: audio) else {
                print("chrono: \(self.t()) ❌ GEN_FAIL \(cacheKey)")
                DispatchQueue.main.async { call.resolve(["success": false]) }
                return
            }
            
            let duration = Double(audio.pointee.n) / Double(audio.pointee.sample_rate)
            let genTime = CFAbsoluteTimeGetCurrent() - genStartTime
            SherpaOnnxDestroyOfflineTtsGeneratedAudio(audio)
            
            SherpaTTSPlugin.cacheQueue.async(flags: .barrier) {
                SherpaTTSPlugin.audioCache[cacheKey] = wavData
                SherpaTTSPlugin.textForKey[cacheKey] = text
            }
            
            print("chrono: \(self.t()) ✅ GEN \(cacheKey) \(String(format: "%.1f", duration))s")
            
            DispatchQueue.main.async {
                call.resolve(["success": true, "cacheKey": cacheKey])
            }
        }
    }
    
    @objc func isCached(_ call: CAPPluginCall) {
        guard let cacheKey = call.getString("cacheKey") else {
            call.resolve(["cached": false])
            return
        }
        var cached = false
        SherpaTTSPlugin.cacheQueue.sync { cached = SherpaTTSPlugin.audioCache[cacheKey] != nil }
        call.resolve(["cached": cached])
    }
    
    @objc func speakCached(_ call: CAPPluginCall) {
        guard let cacheKey = call.getString("cacheKey") else {
            call.resolve(["success": false, "reason": "no_key"])
            return
        }
        
        var wavData: Data?
        SherpaTTSPlugin.cacheQueue.sync { wavData = SherpaTTSPlugin.audioCache[cacheKey] }
        
        guard let data = wavData else {
            print("chrono: \(t()) ⚠️ MISS \(cacheKey)")
            call.resolve(["success": false, "reason": "miss"])
            return
        }
        
        if SherpaTTSPlugin.isSpeaking {
            call.resolve(["success": false, "reason": "busy"])
            return
        }
        
        // Log avec texte complet
        var displayText = cacheKey
        SherpaTTSPlugin.cacheQueue.sync {
            if let t = SherpaTTSPlugin.textForKey[cacheKey] {
                displayText = "\(cacheKey) \"\(t)\""
            }
        }
        print("chrono: \(t()) ▶️ \(displayText)")
        
        SherpaTTSPlugin.isSpeaking = true
        currentPlayingKey = cacheKey
        playAudio(data: data, call: call, key: cacheKey)
    }
    
    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty,
              let tts = SherpaTTSPlugin.sharedTts else {
            call.resolve(["success": true])
            return
        }
        
        if SherpaTTSPlugin.isSpeaking {
            call.resolve(["success": false, "reason": "busy"])
            return
        }
        
        let speed = call.getFloat("speed") ?? 1.0
        SherpaTTSPlugin.isSpeaking = true
        
        let shortText = String(text.prefix(20))
        print("chrono: \(t()) 🔄 DIRECT \"\(shortText)...\"")
        let genStartTime = CFAbsoluteTimeGetCurrent()
        
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self,
                  let audio = SherpaOnnxOfflineTtsGenerate(tts, text, SherpaTTSPlugin.frenchSpeakerId, speed),
                  let wavData = self.createWavData(audio: audio) else {
                SherpaTTSPlugin.isSpeaking = false
                DispatchQueue.main.async { call.resolve(["success": false]) }
                return
            }
            
            let genTime = CFAbsoluteTimeGetCurrent() - genStartTime
            let duration = Double(audio.pointee.n) / Double(audio.pointee.sample_rate)
            SherpaOnnxDestroyOfflineTtsGeneratedAudio(audio)
            
            print("chrono: \(self.t()) ▶️ DIRECT \(String(format: "%.1f", duration))s (gen=\(String(format: "%.1f", genTime))s)")
            
            DispatchQueue.main.async { 
                self.currentPlayingKey = "direct"
                self.playAudio(data: wavData, call: call, key: "direct") 
            }
        }
    }
    
    @objc func stop(_ call: CAPPluginCall) {
        if currentPlayingKey != nil {
            print("chrono: \(t()) ⏹️ STOP")
        }
        audioPlayer?.stop()
        SherpaTTSPlugin.isSpeaking = false
        currentPlayingKey = nil
        pendingCall?.resolve(["success": true])
        pendingCall = nil
        call.resolve(["success": true])
    }
    
    @objc func clearCache(_ call: CAPPluginCall) {
        var count = 0
        SherpaTTSPlugin.cacheQueue.sync { count = SherpaTTSPlugin.audioCache.count }
        SherpaTTSPlugin.cacheQueue.async(flags: .barrier) {
            SherpaTTSPlugin.audioCache.removeAll()
            SherpaTTSPlugin.textForKey.removeAll()
        }
        call.resolve(["success": true, "cleared": count])
    }
    
    @objc func isInitialized(_ call: CAPPluginCall) {
        call.resolve(["initialized": SherpaTTSPlugin.sharedTts != nil])
    }
    
    @objc func resetTimer(_ call: CAPPluginCall) {
        SherpaTTSPlugin.startTime = CFAbsoluteTimeGetCurrent()
        print("chrono: \(t()) 🎬 QUIZ_START")
        call.resolve(["success": true])
    }
    
    @objc func logEvent(_ call: CAPPluginCall) {
        let event = call.getString("event") ?? "?"
        print("chrono: \(t()) \(event)")
        call.resolve(["success": true])
    }
    
    private func playAudio(data: Data, call: CAPPluginCall, key: String? = nil) {
        do {
            // Configure audio session for playback+record (once)
            if !SherpaTTSPlugin.audioSessionReady {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
                try session.setActive(true)
                SherpaTTSPlugin.audioSessionReady = true
            }
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
            if let k = key {
                print("chrono: \(t()) 🔊 START \(k)")
            }
            pendingCall = call
        } catch {
            SherpaTTSPlugin.isSpeaking = false
            call.resolve(["success": false, "reason": "play_error"])
        }
    }
    
    private func createWavData(audio: UnsafePointer<SherpaOnnxGeneratedAudio>) -> Data? {
        let n = Int(audio.pointee.n)
        let sr = Int(audio.pointee.sample_rate)
        guard n > 0, let samples = audio.pointee.samples else { return nil }
        
        let silence = sr / 20
        let total = n + silence
        var wav = Data()
        let dataSize = UInt32(total * 2)
        
        wav.append(contentsOf: [0x52,0x49,0x46,0x46])
        wav.append(contentsOf: withUnsafeBytes(of: (dataSize+36).littleEndian) { Array($0) })
        wav.append(contentsOf: [0x57,0x41,0x56,0x45,0x66,0x6D,0x74,0x20,0x10,0,0,0,1,0,1,0])
        wav.append(contentsOf: withUnsafeBytes(of: UInt32(sr).littleEndian) { Array($0) })
        wav.append(contentsOf: withUnsafeBytes(of: UInt32(sr*2).littleEndian) { Array($0) })
        wav.append(contentsOf: [2,0,16,0,0x64,0x61,0x74,0x61])
        wav.append(contentsOf: withUnsafeBytes(of: dataSize.littleEndian) { Array($0) })
        
        for _ in 0..<silence { wav.append(contentsOf: [0,0]) }
        for i in 0..<n {
            let s = Int16(max(-1, min(1, samples[i])) * 32767)
            wav.append(contentsOf: withUnsafeBytes(of: s.littleEndian) { Array($0) })
        }
        return wav
    }
    
    private func findResource(_ name: String, ext: String) -> String? {
        // Chercher dans les chemins standards
        for p in ["public/assets/models/kokoro", "assets/models/kokoro", "models/kokoro", "kokoro"] {
            if let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: p) {
                return url.path
            }
        }
        // Fallback: racine du bundle (si aplati)
        if let url = Bundle.main.url(forResource: name, withExtension: ext) {
            return url.path
        }
        return nil
    }
    
    private func findDataDir() -> String? {
        if let url = Bundle.main.resourceURL {
            // Chercher espeak-ng-data dans les chemins standards
            for p in ["public/assets/models/kokoro/espeak-ng-data", "assets/models/kokoro/espeak-ng-data", "models/kokoro/espeak-ng-data", "espeak-ng-data"] {
                let u = url.appendingPathComponent(p)
                if FileManager.default.fileExists(atPath: u.path) { return u.path }
            }
            // Fallback: racine si aplati
            let phondataPath = url.appendingPathComponent("phondata")
            if FileManager.default.fileExists(atPath: phondataPath.path) {
                return url.path
            }
        }
        return nil
    }
    
    private func createConfig(modelPath: String, voicesPath: String, tokensPath: String, dataDir: String) -> SherpaOnnxOfflineTtsConfig {
        let e = ""
        let vits = SherpaOnnxOfflineTtsVitsModelConfig(model: (e as NSString).utf8String, lexicon: (e as NSString).utf8String, tokens: (e as NSString).utf8String, data_dir: (e as NSString).utf8String, noise_scale: 0.667, noise_scale_w: 0.8, length_scale: 1.0, dict_dir: (e as NSString).utf8String)
        let matcha = SherpaOnnxOfflineTtsMatchaModelConfig(acoustic_model: (e as NSString).utf8String, vocoder: (e as NSString).utf8String, lexicon: (e as NSString).utf8String, tokens: (e as NSString).utf8String, data_dir: (e as NSString).utf8String, noise_scale: 0.667, length_scale: 1.0, dict_dir: (e as NSString).utf8String)
        let kokoro = SherpaOnnxOfflineTtsKokoroModelConfig(model: (modelPath as NSString).utf8String, voices: (voicesPath as NSString).utf8String, tokens: (tokensPath as NSString).utf8String, data_dir: (dataDir as NSString).utf8String, length_scale: 1.0, dict_dir: (e as NSString).utf8String, lexicon: (e as NSString).utf8String, lang: ("fr" as NSString).utf8String)
        let kitten = SherpaOnnxOfflineTtsKittenModelConfig(model: (e as NSString).utf8String, voices: (e as NSString).utf8String, tokens: (e as NSString).utf8String, data_dir: (e as NSString).utf8String, length_scale: 1.0)
        let zipvoice = SherpaOnnxOfflineTtsZipvoiceModelConfig(tokens: (e as NSString).utf8String, text_model: (e as NSString).utf8String, flow_matching_model: (e as NSString).utf8String, vocoder: (e as NSString).utf8String, data_dir: (e as NSString).utf8String, pinyin_dict: (e as NSString).utf8String, feat_scale: 0, t_shift: 0, target_rms: 0, guidance_scale: 0)
        let model = SherpaOnnxOfflineTtsModelConfig(vits: vits, num_threads: 2, debug: 0, provider: ("cpu" as NSString).utf8String, matcha: matcha, kokoro: kokoro, kitten: kitten, zipvoice: zipvoice)
        return SherpaOnnxOfflineTtsConfig(model: model, rule_fsts: (e as NSString).utf8String, max_num_sentences: 1, rule_fars: (e as NSString).utf8String, silence_scale: 1.0)
    }
}

extension SherpaTTSPlugin: AVAudioPlayerDelegate {
    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        if let key = currentPlayingKey {
            print("chrono: \(t()) ⏸️ END \(key)")
        }
        SherpaTTSPlugin.isSpeaking = false
        currentPlayingKey = nil
        pendingCall?.resolve(["success": flag])
        pendingCall = nil
        notifyListeners("speechEnd", data: ["success": flag])
    }
}
