import UIKit
import Capacitor

// Capacitor 6 does NOT auto-discover app-local Swift plugins (that only worked
// for the old ObjC CAP_PLUGIN macro). Register the embedded Apple plugin
// explicitly here so `registerPlugin('SignInWithApple')` on the JS side resolves
// to a real native implementation instead of failing "not implemented".
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SignInWithApplePlugin())
        bridge?.registerPluginInstance(BiometricAuthPlugin())
        bridge?.registerPluginInstance(NotifyPlugin())
        bridge?.registerPluginInstance(StoreKitPlugin())
    }
}
