import Foundation
import Capacitor
import StripePaymentSheet
import StripePaymentsUI
import StripeApplePay
import PassKit

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
        // No card mandate paragraph in the sheet (owner 2026-10-27): the checkout
        // screen already says it renews and links the Terms before the button.
        config.termsDisplay = [.card: .never]
        // Ringo's look: the orange Pay button, the app's cream and ink, 14pt corners.
        var look = PaymentSheet.Appearance()
        look.colors.primary = UIColor(red: 0xD6/255, green: 0x40/255, blue: 0x00/255, alpha: 1)
        look.colors.background = UIColor(red: 0xFF/255, green: 0xFA/255, blue: 0xF7/255, alpha: 1)
        look.colors.componentBackground = .white
        look.colors.text = UIColor(red: 0x1A/255, green: 0x0F/255, blue: 0x2E/255, alpha: 1)
        look.colors.textSecondary = UIColor(red: 0x4A/255, green: 0x3F/255, blue: 0x60/255, alpha: 1)
        look.colors.componentBorder = UIColor(red: 0x1A/255, green: 0x0F/255, blue: 0x2E/255, alpha: 0.16)
        look.cornerRadius = 14
        look.borderWidth = 1.5
        look.primaryButton.backgroundColor = look.colors.primary
        look.primaryButton.textColor = .white
        look.primaryButton.cornerRadius = 14
        look.primaryButton.height = 54
        config.appearance = look
        config.style = .alwaysLight
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

// Inline checkout (owner 2026-10-27: "this should come at the same page as the
// ui check out"): the processor's own one-line card field and Apple's Pay
// button, drawn natively over the Checkout page where the web page leaves a
// slot, so the card is typed on that page and not in a sheet. Card numbers go
// straight from the field to the processor; Ringo never sees them. The web page
// sends the slot's place on screen every frame it moves (lib/inlinePay.ts).
// Confirming runs here, 3D Secure included; JS still asks /api/light-status
// whether it is paid before it tells the buyer anything.
@objc(InlinePayPlugin)
public class InlinePayPlugin: CAPPlugin, CAPBridgedPlugin, STPPaymentCardTextFieldDelegate, ApplePayContextDelegate, STPAuthenticationContext {
    public let identifier = "InlinePayPlugin"
    public let jsName = "InlinePay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canApplePay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "place", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setHidden", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unmount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "confirmCard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "payApple", returnType: CAPPluginReturnPromise),
    ]

    private var card: STPPaymentCardTextField?
    private var appleButton: PKPaymentButton?
    private var appleCall: CAPPluginCall?
    private var appleSecret: String?

    private var merchantId: String? {
        let m = Bundle.main.object(forInfoDictionaryKey: "RingoApplePayMerchantId") as? String
        return (m?.hasPrefix("merchant.") ?? false) ? m : nil
    }

    @objc func canApplePay(_ call: CAPPluginCall) {
        call.resolve(["available": merchantId != nil && StripeAPI.deviceSupportsApplePay()])
    }

    /// Puts (or moves) the card field or the Apple Pay button at the slot's place on screen.
    @objc func place(_ call: CAPPluginCall) {
        let kind = call.getString("kind") ?? "card"
        let frame = CGRect(x: call.getDouble("x") ?? 0, y: call.getDouble("y") ?? 0, width: call.getDouble("width") ?? 0, height: call.getDouble("height") ?? 0)
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let web = self.bridge?.webView else { call.reject("no_view"); return }
            let view: UIView = kind == "applePay" ? self.makeAppleButton() : self.makeCard()
            if view.superview == nil { web.addSubview(view) }
            view.frame = frame
            call.resolve()
        }
    }

    @objc func setHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? true
        DispatchQueue.main.async { [weak self] in
            if hidden { self?.card?.resignFirstResponder() }
            self?.card?.isHidden = hidden
            self?.appleButton?.isHidden = hidden
            call.resolve()
        }
    }

    @objc func unmount(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.card?.removeFromSuperview(); self?.card = nil
            self?.appleButton?.removeFromSuperview(); self?.appleButton = nil
            call.resolve()
        }
    }

    private func makeCard() -> STPPaymentCardTextField {
        if let c = card { return c }
        let c = STPPaymentCardTextField()
        c.postalCodeEntryEnabled = false
        c.numberPlaceholder = NSLocalizedString("Card number", comment: "Placeholder in the card field at checkout")
        c.backgroundColor = .white
        c.textColor = UIColor(red: 0x1A/255, green: 0x0F/255, blue: 0x2E/255, alpha: 1)
        c.borderColor = UIColor(red: 0x1A/255, green: 0x0F/255, blue: 0x2E/255, alpha: 0.16)
        c.borderWidth = 1.5
        c.cornerRadius = 14
        c.delegate = self
        card = c
        return c
    }

    private func makeAppleButton() -> PKPaymentButton {
        if let b = appleButton { return b }
        let b = PKPaymentButton(paymentButtonType: .plain, paymentButtonStyle: .black)
        b.cornerRadius = 14
        b.addTarget(self, action: #selector(appleTapped), for: .touchUpInside)
        appleButton = b
        return b
    }

    @objc private func appleTapped() { notifyListeners("applePayTap", data: [:]) }

    public func paymentCardTextFieldDidChange(_ textField: STPPaymentCardTextField) {
        notifyListeners("cardChange", data: ["complete": textField.isValid])
    }

    /// Confirms the intent with the card typed in the field (3D Secure shown here when the bank asks).
    @objc func confirmCard(_ call: CAPPluginCall) {
        guard let secret = call.getString("clientSecret"), !secret.isEmpty,
              let key = call.getString("publishableKey"), key.hasPrefix("pk_") else { call.reject("missing_secret"); return }
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let field = self.card, field.isValid else { call.resolve(["status": "failed", "message": "Check your card details and try again. Nothing was charged."]); return }
            STPAPIClient.shared.publishableKey = key
            let pm = field.paymentMethodParams
            if let email = call.getString("email"), !email.isEmpty {
                let billing = pm.billingDetails ?? STPPaymentMethodBillingDetails()
                billing.email = email
                pm.billingDetails = billing
            }
            let params = STPPaymentIntentParams(clientSecret: secret)
            params.paymentMethodParams = pm
            params.returnURL = "ringo://stripe-redirect"
            STPPaymentHandler.shared().confirmPayment(params, with: self) { status, _, error in
                switch status {
                case .succeeded: call.resolve(["status": "completed"])
                case .canceled: call.resolve(["status": "canceled"])
                case .failed: call.resolve(["status": "failed", "message": error?.localizedDescription ?? ""])
                @unknown default: call.resolve(["status": "failed", "message": ""])
                }
            }
        }
    }

    public func authenticationPresentingViewController() -> UIViewController {
        return bridge?.viewController ?? UIViewController()
    }

    /// Apple Pay for the intent already minted: amount in minor units, as the site charges it.
    @objc func payApple(_ call: CAPPluginCall) {
        guard let secret = call.getString("clientSecret"), !secret.isEmpty,
              let key = call.getString("publishableKey"), key.hasPrefix("pk_"),
              let merchant = merchantId else { call.reject("missing_secret"); return }
        let amount = NSDecimalNumber(value: call.getInt("amount") ?? 0).dividing(by: 100)
        let currency = (call.getString("currency") ?? "usd").uppercased()
        let label = call.getString("label") ?? "Ringo eSIM"
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            STPAPIClient.shared.publishableKey = key
            let request = StripeAPI.paymentRequest(withMerchantIdentifier: merchant, country: "GB", currency: currency)
            // No billing address to fill in: one tap and Face ID.
            request.requiredBillingContactFields = []
            request.paymentSummaryItems = [PKPaymentSummaryItem(label: label, amount: amount), PKPaymentSummaryItem(label: "Ringo", amount: amount)]
            if call.getBool("monthly") == true, #available(iOS 16.0, *), let manage = URL(string: "https://ringoesim.com") {
                let regular = PKRecurringPaymentSummaryItem(label: label, amount: amount)
                regular.intervalUnit = .month
                request.recurringPaymentRequest = PKRecurringPaymentRequest(paymentDescription: label, regularBilling: regular, managementURL: manage)
            }
            guard let context = STPApplePayContext(paymentRequest: request, delegate: self) else {
                call.resolve(["status": "failed", "message": "Apple Pay is not available. Pay by card instead. Nothing was charged."]); return
            }
            self.appleCall = call
            self.appleSecret = secret
            context.presentApplePay()
        }
    }

    public func applePayContext(_ context: STPApplePayContext, didCreatePaymentMethod paymentMethod: StripeAPI.PaymentMethod, paymentInformation: PKPayment, completion: @escaping STPIntentClientSecretCompletionBlock) {
        completion(appleSecret, nil)
    }

    public func applePayContext(_ context: STPApplePayContext, didCompleteWith status: STPApplePayContext.PaymentStatus, error: Error?) {
        guard let call = appleCall else { return }
        appleCall = nil
        appleSecret = nil
        switch status {
        case .success: call.resolve(["status": "completed"])
        case .userCancellation: call.resolve(["status": "canceled"])
        case .error: call.resolve(["status": "failed", "message": error?.localizedDescription ?? ""])
        }
    }
}
