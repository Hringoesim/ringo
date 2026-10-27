import Foundation
import UIKit
import Capacitor
import StoreKit

// Embedded App Store rating plugin (Capacitor 6 CAPBridgedPlugin, registered
// in MainViewController). JS calls request() once per phone, only after a
// delivered eSIM shows data in use (src/lib/review.ts). Apple decides whether
// the dialog actually appears (at most three times a year), so this never
// reports back whether the person rated.
@objc(ReviewPlugin)
public class ReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReviewPlugin"
    public let jsName = "Review"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
    ]

    @objc func request(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let scene = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive }
            guard let scene = scene else { call.resolve(["asked": false]); return }
            AppStore.requestReview(in: scene)
            call.resolve(["asked": true])
        }
    }
}
