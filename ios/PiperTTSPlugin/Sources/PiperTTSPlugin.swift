import Foundation
import Capacitor

@objc(PiperTTSPlugin)
public class PiperTTSPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PiperTTSPlugin"
    public let jsName = "PiperTTSPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getVoices", returnType: CAPPluginReturnPromise)
    ]
    
    private var isInitialized = false
    
    override public func load() {
        NSLog("✅✅✅ PiperTTSPlugin.load() Swift called!")
    }
    
    @objc public func initialize(_ call: CAPPluginCall) {
        NSLog("🎯 PiperTTS.initialize() called from TypeScript!")
        
        let modelPath = call.getString("modelPath") ?? ""
        let configPath = call.getString("configPath") ?? ""
        
        if modelPath.isEmpty || configPath.isEmpty {
            call.reject("Missing modelPath or configPath")
            return
        }
        
        NSLog("📂 Model: \(modelPath)")
        isInitialized = true
        
        call.resolve([
            "initialized": true,
            "message": "Plugin fonctionne ! 🎉"
        ])
    }
    
    @objc public func speak(_ call: CAPPluginCall) {
        NSLog("🔊 PiperTTS.speak() called!")
        
        guard isInitialized else {
            call.reject("PiperTTS not initialized")
            return
        }
        
        let text = call.getString("text") ?? ""
        if text.isEmpty {
            call.reject("Missing text parameter")
            return
        }
        
        NSLog("📝 Text: \(text)")
        
        call.resolve([
            "playing": true,
            "message": "Speak fonctionne ! ✅"
        ])
    }
    
    @objc public func stop(_ call: CAPPluginCall) {
        NSLog("⏹️ PiperTTS.stop() called!")
        call.resolve()
    }
    
    @objc public func getVoices(_ call: CAPPluginCall) {
        call.resolve([
            "voices": [
                [
                    "voiceURI": "fr-FR-siwis-medium",
                    "name": "Siwis (French - Medium)",
                    "lang": "fr-FR",
                    "default": true
                ]
            ]
        ])
    }
}
