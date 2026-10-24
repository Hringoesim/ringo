import Foundation
import Capacitor
import StripePaymentSheet

// Embedded payment plugin (owner 2026-10-24: "our own embedded check out to
// minimise risk"): Stripe's native payment sheet drawn inside the app, card,
// Link and Apple Pay, instead of Stripe's hosted page in a browser sheet.
// ringoesim.com mints the intent (api/app-pay.js) and decides the amount; the
// sheet only collects the card and confirms. JS still asks /api/light-status
// whether Stripe says paid before it tells the buyer anything.
// Apple Pay shows only when Info.plist names a merchant ID (RingoApplePayMerchantId).
@objc(PaymentSheetPlugin)
public class PaymentSheetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PaymentSheetPlugin"
    public let jsName = "PaymentSheet"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
    ]

    private var sheet: PaymentSheet?

    @objc func present(_ call: CAPPluginCall) {
        guard let secret = call.getString("clientSecret"), !secret.isEmpty,
              let key = call.getString("publishableKey"), key.hasPrefix("pk_") else {
            call.reject("missing_secret")
            return
        }
        STPAPIClient.shared.publishableKey = key
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = "Ringo"
        config.returnURL = "ringo://stripe-redirect"
        config.allowsDelayedPaymentMethods = false
        config.primaryButtonLabel = call.getString("buttonLabel")
        if let email = call.getString("email"), !email.isEmpty { config.defaultBillingDetails.email = email }
        if let merchant = Bundle.main.object(forInfoDictionaryKey: "RingoApplePayMerchantId") as? String, merchant.hasPrefix("merchant.") {
            config.applePay = .init(merchantId: merchant, merchantCountryCode: "GB")
        }
        let made = PaymentSheet(paymentIntentClientSecret: secret, configuration: config)
        sheet = made
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.bridge?.viewController else { call.reject("no_view"); return }
            made.present(from: vc) { result in
                self?.sheet = nil
                switch result {
                case .completed: call.resolve(["status": "completed"])
                case .canceled: call.resolve(["status": "canceled"])
                case .failed(let error): call.resolve(["status": "failed", "message": error.localizedDescription])
                }
            }
        }
    }
}
