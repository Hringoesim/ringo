import Foundation
import UIKit
import Capacitor
import AuthenticationServices

// Embedded native "Sign in with Apple" plugin (pure Swift, Capacitor 6
// CAPBridgedPlugin — auto-registered, no external pod/SPM package). Exposes a
// single `authorize` method that presents the system ASAuthorization sheet and
// returns the identity token for Supabase signInWithIdToken verification.
@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    public let identifier = "SignInWithApplePlugin"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        pendingCall = call
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        if let nonce = call.getString("nonce") { request.nonce = nonce }
        DispatchQueue.main.async {
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            pendingCall?.reject("No identity token returned by Apple.")
            pendingCall = nil
            return
        }
        var response: [String: Any] = ["identityToken": token, "user": cred.user]
        if let codeData = cred.authorizationCode, let code = String(data: codeData, encoding: .utf8) {
            response["authorizationCode"] = code
        }
        if let email = cred.email { response["email"] = email }
        if let given = cred.fullName?.givenName { response["givenName"] = given }
        if let family = cred.fullName?.familyName { response["familyName"] = family }
        pendingCall?.resolve(["response": response])
        pendingCall = nil
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        pendingCall?.reject(error.localizedDescription, nil, error)
        pendingCall = nil
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window { return window }
        // Fall back to the app's active key window if the bridge VC has none.
        let windows = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
        return windows.first(where: { $0.isKeyWindow }) ?? windows.first ?? ASPresentationAnchor()
    }
}
