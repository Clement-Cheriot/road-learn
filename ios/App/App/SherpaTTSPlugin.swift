//
//  SherpaTTSPlugin.swift
//  App
//
//  Plugin Capacitor pour TTS avec Sherpa-ONNX (voix Piper française)
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
        CAPPluginMethod(name: "isInitialized", returnType: CAPPluginReturnPromise)
    ]
    
    // Singleton pour éviter double initialisation
    private static var sharedTts: OpaquePointer?
    private static var sharedSampleRate: Int32 = 22050
    private static var isInitializing = false
    
    private var audioPlayer: AVAudioPlayer?
    private var isPlaying = false
    private var pendingCall: CAPPluginCall?  // Pour résoudre après lecture
    
    // File d'attente pour éviter les chevauchements
    private static var speakQueue: [(text: String, speed: Float, call: CAPPluginCall)] = []
    private static var isSpeaking = false
    
    // MARK: - Plugin Methods
    
    @objc func initialize(_ call: CAPPluginCall) {
        // Déjà initialisé ?
        if SherpaTTSPlugin.sharedTts != nil {
            print("✅ [SherpaTTS] Already initialized")
            call.resolve(["success": true, "sampleRate": SherpaTTSPlugin.sharedSampleRate])
            return
        }
        
        // En cours d'initialisation ?
        if SherpaTTSPlugin.isInitializing {
            print("⏳ [SherpaTTS] Initialization in progress...")
            call.resolve(["success": true, "sampleRate": SherpaTTSPlugin.sharedSampleRate])
            return
        }
        
        SherpaTTSPlugin.isInitializing = true
        print("🎯 [SherpaTTS] Initializing...")
        
        // Configurer la session audio
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .default)
            try audioSession.setActive(true)
        } catch {
            print("❌ [SherpaTTS] Audio session error: \(error)")
        }
        
        // Trouver les fichiers
        guard let modelPath = findResourcePath("fr_FR-siwis-medium", ext: "onnx"),
              let tokensPath = findResourcePath("tokens", ext: "txt"),
              let dataDir = findEspeakDataDir() else {
            SherpaTTSPlugin.isInitializing = false
            call.reject("Model files not found")
            return
        }
        
        print("📁 [SherpaTTS] Model: \(modelPath)")
        print("📁 [SherpaTTS] Data dir: \(dataDir)")
        
        // Créer la config
        var config = createTTSConfig(modelPath: modelPath, tokensPath: tokensPath, dataDir: dataDir)
        
        // Créer l'instance TTS
        SherpaTTSPlugin.sharedTts = SherpaOnnxCreateOfflineTts(&config)
        
        if SherpaTTSPlugin.sharedTts == nil {
            SherpaTTSPlugin.isInitializing = false
            call.reject("Failed to initialize Sherpa TTS")
            return
        }
        
        SherpaTTSPlugin.sharedSampleRate = SherpaOnnxOfflineTtsSampleRate(SherpaTTSPlugin.sharedTts)
        SherpaTTSPlugin.isInitializing = false
        
        print("✅ [SherpaTTS] Initialized! Sample rate: \(SherpaTTSPlugin.sharedSampleRate)")
        call.resolve(["success": true, "sampleRate": SherpaTTSPlugin.sharedSampleRate])
    }
    
    private func createTTSConfig(modelPath: String, tokensPath: String, dataDir: String) -> SherpaOnnxOfflineTtsConfig {
        let empty = ""
        
        let vitsConfig = SherpaOnnxOfflineTtsVitsModelConfig(
            model: (modelPath as NSString).utf8String,
            lexicon: (empty as NSString).utf8String,
            tokens: (tokensPath as NSString).utf8String,
            data_dir: (dataDir as NSString).utf8String,
            noise_scale: 0.667,
            noise_scale_w: 0.8,
            length_scale: 1.0,
            dict_dir: (empty as NSString).utf8String
        )
        
        let matchaConfig = SherpaOnnxOfflineTtsMatchaModelConfig(
            acoustic_model: (empty as NSString).utf8String,
            vocoder: (empty as NSString).utf8String,
            lexicon: (empty as NSString).utf8String,
            tokens: (empty as NSString).utf8String,
            data_dir: (empty as NSString).utf8String,
            noise_scale: 0.667,
            length_scale: 1.0,
            dict_dir: (empty as NSString).utf8String
        )
        
        let kokoroConfig = SherpaOnnxOfflineTtsKokoroModelConfig(
            model: (empty as NSString).utf8String,
            voices: (empty as NSString).utf8String,
            tokens: (empty as NSString).utf8String,
            data_dir: (empty as NSString).utf8String,
            length_scale: 1.0,
            dict_dir: (empty as NSString).utf8String,
            lexicon: (empty as NSString).utf8String,
            lang: (empty as NSString).utf8String
        )
        
        let kittenConfig = SherpaOnnxOfflineTtsKittenModelConfig(
            model: (empty as NSString).utf8String,
            voices: (empty as NSString).utf8String,
            tokens: (empty as NSString).utf8String,
            data_dir: (empty as NSString).utf8String,
            length_scale: 1.0
        )
        
        let zipvoiceConfig = SherpaOnnxOfflineTtsZipvoiceModelConfig(
            tokens: (empty as NSString).utf8String,
            text_model: (empty as NSString).utf8String,
            flow_matching_model: (empty as NSString).utf8String,
            vocoder: (empty as NSString).utf8String,
            data_dir: (empty as NSString).utf8String,
            pinyin_dict: (empty as NSString).utf8String,
            feat_scale: 0.0,
            t_shift: 0.0,
            target_rms: 0.0,
            guidance_scale: 0.0
        )
        
        let modelConfig = SherpaOnnxOfflineTtsModelConfig(
            vits: vitsConfig,
            num_threads: 2,
            debug: 0,  // Désactiver debug Sherpa
            provider: ("cpu" as NSString).utf8String,
            matcha: matchaConfig,
            kokoro: kokoroConfig,
            kitten: kittenConfig,
            zipvoice: zipvoiceConfig
        )
        
        return SherpaOnnxOfflineTtsConfig(
            model: modelConfig,
            rule_fsts: (empty as NSString).utf8String,
            max_num_sentences: 1,
            rule_fars: (empty as NSString).utf8String,
            silence_scale: 1.0
        )
    }
    
    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            // Ignorer silencieusement les textes vides
            call.resolve(["success": true])
            return
        }
        
        guard SherpaTTSPlugin.sharedTts != nil else {
            call.reject("TTS not initialized")
            return
        }
        
        let speed = call.getFloat("speed") ?? 1.0
        
        // Si déjà en train de parler, ajouter à la queue
        if SherpaTTSPlugin.isSpeaking {
            print("⏳ [SherpaTTS] Queueing: \"\(text.prefix(30))...\"")
            SherpaTTSPlugin.speakQueue.append((text: text, speed: speed, call: call))
            return
        }
        
        processSpeak(text: text, speed: speed, call: call)
    }
    
    private func processSpeak(text: String, speed: Float, call: CAPPluginCall) {
        guard let tts = SherpaTTSPlugin.sharedTts else {
            call.reject("TTS not initialized")
            return
        }
        
        SherpaTTSPlugin.isSpeaking = true
        print("🎤 [SherpaTTS] Full text (\(text.count) chars):")
        print(text)
        
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            // Générer l'audio + phonèmes
            let audio = SherpaOnnxOfflineTtsGenerate(tts, text, 0, speed)
            
            guard let audio = audio else {
                SherpaTTSPlugin.isSpeaking = false
                DispatchQueue.main.async { call.reject("Synthesis failed") }
                return
            }
            
            let numSamples = Int(audio.pointee.n)
            let duration = Double(numSamples) / Double(audio.pointee.sample_rate)
            print("✅ [SherpaTTS] Generated \(String(format: "%.1f", duration))s of audio")
            
            guard let wavData = self.createWavData(audio: audio) else {
                SherpaOnnxDestroyOfflineTtsGeneratedAudio(audio)
                SherpaTTSPlugin.isSpeaking = false
                DispatchQueue.main.async { call.reject("WAV conversion failed") }
                return
            }
            
            SherpaOnnxDestroyOfflineTtsGeneratedAudio(audio)
            
            DispatchQueue.main.async {
                self.playAudio(data: wavData, call: call)
            }
        }
    }
    
    private func processNextInQueue() {
        guard !SherpaTTSPlugin.speakQueue.isEmpty else {
            SherpaTTSPlugin.isSpeaking = false
            return
        }
        
        let next = SherpaTTSPlugin.speakQueue.removeFirst()
        processSpeak(text: next.text, speed: next.speed, call: next.call)
    }
    
    @objc func stop(_ call: CAPPluginCall) {
        // Vider la queue et résoudre les calls en attente
        let queueCount = SherpaTTSPlugin.speakQueue.count
        for item in SherpaTTSPlugin.speakQueue {
            item.call.resolve(["success": true])  // Résoudre sans erreur
        }
        SherpaTTSPlugin.speakQueue.removeAll()
        SherpaTTSPlugin.isSpeaking = false
        
        // Résoudre le call en cours de lecture
        pendingCall?.resolve(["success": true])
        pendingCall = nil
        
        // Arrêter la lecture en cours
        audioPlayer?.stop()
        isPlaying = false
        
        if queueCount > 0 {
            print("🛑 [SherpaTTS] Stopped + cleared \(queueCount) queued items")
        }
        
        call.resolve(["success": true])
    }
    
    @objc func isInitialized(_ call: CAPPluginCall) {
        call.resolve(["initialized": SherpaTTSPlugin.sharedTts != nil])
    }
    
    // MARK: - Private Methods
    
    private func findResourcePath(_ name: String, ext: String) -> String? {
        // Direct dans le bundle
        if let path = Bundle.main.path(forResource: name, ofType: ext) {
            return path
        }
        
        // Sous-dossiers
        let searchPaths = ["models/piper", "Resources/models/piper", "piper", "models", "public/assets/models/piper", "assets/models/piper"]
        for subpath in searchPaths {
            if let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: subpath) {
                return url.path
            }
        }
        
        // Recherche manuelle
        if let resourcePath = Bundle.main.resourcePath {
            let enumerator = FileManager.default.enumerator(atPath: resourcePath)
            let targetFile = "\(name).\(ext)"
            while let file = enumerator?.nextObject() as? String {
                if file.hasSuffix(targetFile) {
                    let fullPath = (resourcePath as NSString).appendingPathComponent(file)
                    return fullPath
                }
            }
        }
        
        print("❌ [SherpaTTS] Model file not found: \(name).\(ext)")
        return nil
    }
    
    private func findEspeakDataDir() -> String? {
        if let url = Bundle.main.url(forResource: "espeak-ng-data", withExtension: nil) {
            return url.path
        }
        
        if let resourceURL = Bundle.main.resourceURL {
            let knownPaths = [
                "public/models/vits-piper-fr_FR-siwis-medium/espeak-ng-data",
                "public/assets/models/piper/espeak-ng-data",
                "assets/models/piper/espeak-ng-data",
                "espeak-ng-data"
            ]
            for knownPath in knownPaths {
                let espeakURL = resourceURL.appendingPathComponent(knownPath)
                if FileManager.default.fileExists(atPath: espeakURL.path) {
                    return espeakURL.path
                }
            }
        }
        
        // Recherche du dossier
        if let resourcePath = Bundle.main.resourcePath {
            let enumerator = FileManager.default.enumerator(atPath: resourcePath)
            while let file = enumerator?.nextObject() as? String {
                if file.hasSuffix("espeak-ng-data") {
                    let fullPath = (resourcePath as NSString).appendingPathComponent(file)
                    var isDir: ObjCBool = false
                    if FileManager.default.fileExists(atPath: fullPath, isDirectory: &isDir), isDir.boolValue {
                        return fullPath
                    }
                }
            }
        }
        
        return nil
    }
    
    private func createWavData(audio: UnsafePointer<SherpaOnnxGeneratedAudio>) -> Data? {
        let numSamples = Int(audio.pointee.n)
        let sampleRate = Int(audio.pointee.sample_rate)
        
        guard numSamples > 0, let samples = audio.pointee.samples else { return nil }
        
        // Ajouter 50ms de silence au début pour éviter coupure matérielle
        let silenceSamples = sampleRate / 20  // 50ms
        let totalSamples = numSamples + silenceSamples
        
        var wavData = Data()
        let dataSize = UInt32(totalSamples * 2)
        let fileSize = dataSize + 36
        let byteRate = UInt32(sampleRate * 2)
        
        // RIFF header
        wavData.append(contentsOf: [0x52, 0x49, 0x46, 0x46])
        wavData.append(contentsOf: withUnsafeBytes(of: fileSize.littleEndian) { Array($0) })
        wavData.append(contentsOf: [0x57, 0x41, 0x56, 0x45])
        
        // fmt chunk
        wavData.append(contentsOf: [0x66, 0x6D, 0x74, 0x20])
        wavData.append(contentsOf: [0x10, 0x00, 0x00, 0x00])
        wavData.append(contentsOf: [0x01, 0x00])
        wavData.append(contentsOf: [0x01, 0x00])
        wavData.append(contentsOf: withUnsafeBytes(of: UInt32(sampleRate).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: byteRate.littleEndian) { Array($0) })
        wavData.append(contentsOf: [0x02, 0x00])
        wavData.append(contentsOf: [0x10, 0x00])
        
        // data chunk
        wavData.append(contentsOf: [0x64, 0x61, 0x74, 0x61])
        wavData.append(contentsOf: withUnsafeBytes(of: dataSize.littleEndian) { Array($0) })
        
        // Silence au début (50ms)
        for _ in 0..<silenceSamples {
            wavData.append(contentsOf: [0x00, 0x00])  // Sample à 0
        }
        
        // Samples audio
        for i in 0..<numSamples {
            let sample = samples[i]
            let clamped = max(-1.0, min(1.0, sample))
            let scaled = Int16(clamped * 32767.0)
            wavData.append(contentsOf: withUnsafeBytes(of: scaled.littleEndian) { Array($0) })
        }
        
        return wavData
    }
    
    private func playAudio(data: Data, call: CAPPluginCall) {
        do {
            // DEBUG: Sauvegarder le WAV dans Documents (chemin plus simple)
            let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let wavPath = documentsDir.appendingPathComponent("sherpa_latest.wav")
            try data.write(to: wavPath)
            print("💾 [SherpaTTS] WAV saved to: \(wavPath.path)")
            
            // Activer la session audio AVANT de créer le player
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .default)
            try audioSession.setActive(true)
            
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()  // Jouer immédiatement sans délai
            
            isPlaying = true
            
            // Stocker le call pour le résoudre après la lecture
            pendingCall = call
            
            // NE PAS résoudre ici - attendre audioPlayerDidFinishPlaying
        } catch {
            SherpaTTSPlugin.isSpeaking = false
            call.reject("Failed to play audio: \(error.localizedDescription)")
        }
    }
}

// MARK: - AVAudioPlayerDelegate
extension SherpaTTSPlugin: AVAudioPlayerDelegate {
    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isPlaying = false
        
        // Résoudre le call en attente
        pendingCall?.resolve(["success": flag])
        pendingCall = nil
        
        notifyListeners("speechEnd", data: ["success": flag])
        
        // Traiter le prochain dans la queue
        processNextInQueue()
    }
}
