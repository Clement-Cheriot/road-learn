import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        NSLog("🎯🎯🎯 capacitorDidLoad() called - Registering SherpaTTSPlugin")
        bridge?.registerPluginInstance(SherpaTTSPlugin())
        NSLog("✅ SherpaTTSPlugin registered!")
    }
}
