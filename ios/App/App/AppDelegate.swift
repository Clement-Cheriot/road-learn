import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    
    override init() {
        super.init()
        NSLog("🔧 AppDelegate.init() - Tentative d'enregistrement PiperTTSPlugin")
    }

    func application(_ application: UIApplication, 
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        NSLog("🔍 AppDelegate initialized")
        
        // Enregistrer le plugin Sherpa TTS
        if let bridge = (window?.rootViewController as? CAPBridgeViewController)?.bridge {
            NSLog("🎯 Bridge found! Registering SherpaTTSPlugin...")
            bridge.registerPluginInstance(SherpaTTSPlugin())
            NSLog("✅ SherpaTTSPlugin registered via AppDelegate!")
        } else {
            NSLog("❌ Bridge not found in AppDelegate")
        }
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
