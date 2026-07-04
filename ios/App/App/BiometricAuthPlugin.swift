import Foundation
import Capacitor
import LocalAuthentication

// Embedded native Face ID / Touch ID plugin (Capacitor 6 CAPBridgedPlugin,
// registered in MainViewController). Uses LocalAuthentication so the Lock screen
// runs a real biometric prompt, with device-passcode fallback.
@objc(BiometricAuthPlugin)
public class BiometricAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricAuthPlugin"
    public let jsName = "BiometricAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var error: NSError?
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        var type = "none"
        switch ctx.biometryType {
        case .faceID: type = "faceId"
        case .touchID: type = "touchId"
        default: type = "none"
        }
        call.resolve(["available": ok, "biometryType": type])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock Ringo"
        let ctx = LAContext()
        ctx.localizedFallbackTitle = call.getString("fallbackTitle") ?? "Use Passcode"
        // deviceOwnerAuthentication = biometrics with automatic passcode fallback.
        let policy: LAPolicy = .deviceOwnerAuthentication
        var error: NSError?
        guard ctx.canEvaluatePolicy(policy, error: &error) else {
            call.reject(error?.localizedDescription ?? "Biometrics unavailable", "unavailable")
            return
        }
        ctx.evaluatePolicy(policy, localizedReason: reason) { success, err in
            DispatchQueue.main.async {
                if success {
                    call.resolve(["success": true])
                } else {
                    call.reject(err?.localizedDescription ?? "Authentication failed", "failed")
                }
            }
        }
    }
}
