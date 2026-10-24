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
        bridge?.registerPluginInstance(LocationPlugin())
        bridge?.registerPluginInstance(PaymentSheetPlugin())
        bridge?.registerPluginInstance(StoreKitPlugin())
        bridge?.registerPluginInstance(GoogleSignInPlugin())
        // Every screen scrolls inside its own column; the page itself never
        // moves. Without this, focusing a field (the email on sign-in) lets
        // iOS scroll the whole web view down and the status bar sits over an
        // empty strip with its white clock invisible.
        if let scroll = webView?.scrollView {
            scroll.isScrollEnabled = false
            scroll.bounces = false
        }
        for name in [UIResponder.keyboardWillShowNotification, UIResponder.keyboardDidShowNotification, UIResponder.keyboardDidHideNotification] {
            NotificationCenter.default.addObserver(self, selector: #selector(pinPage), name: name, object: nil)
        }
    }

    @objc private func pinPage() {
        guard let scroll = webView?.scrollView else { return }
        let top = CGPoint.zero
        if scroll.contentOffset != top { scroll.setContentOffset(top, animated: false) }
        DispatchQueue.main.async {
            if scroll.contentOffset != top { scroll.setContentOffset(top, animated: false) }
        }
    }
}
