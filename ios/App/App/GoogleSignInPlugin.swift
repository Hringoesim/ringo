import Foundation
import UIKit
import Capacitor
import AuthenticationServices
import CryptoKit

// Embedded "Sign in with Google" plugin (pure Swift, no SDK): the standard
// OAuth 2.0 authorization-code flow with PKCE in the system's
// ASWebAuthenticationSession (a Safari sheet, which Google accepts; an
// embedded web view it would refuse), then the code is exchanged for an
// ID token at Google's token endpoint. An iOS OAuth client has no secret;
// PKCE and the reversed-client-id redirect are what bind the code to this
// app. JS gets the ID token and hands it to ringoesim.com, which verifies
// it against Google's keys and the client id.
//
//   signIn({ clientId, nonce }) -> { idToken, accessToken }
@objc(GoogleSignInPlugin)
public class GoogleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "GoogleSignInPlugin"
    public let jsName = "GoogleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAuth", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?

    private static func randomString(_ bytes: Int) -> String {
        var data = [UInt8](repeating: 0, count: bytes)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &data)
        return Data(data).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
    private static func s256(_ s: String) -> String {
        let digest = SHA256.hash(data: Data(s.utf8))
        return Data(digest).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }

    @objc func signIn(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId"), !clientId.isEmpty else { call.reject("Google sign-in is not configured."); return }
        let nonce = call.getString("nonce") ?? GoogleSignInPlugin.randomString(24)
        let verifier = GoogleSignInPlugin.randomString(48)
        let state = GoogleSignInPlugin.randomString(16)
        // The reversed client id is the redirect scheme Google issues to an iOS client.
        let parts = clientId.split(separator: ".").map(String.init)
        let scheme = parts.reversed().joined(separator: ".")
        let redirect = "\(scheme):/oauth2redirect"
        var comps = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        comps.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: redirect),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: GoogleSignInPlugin.s256(verifier)),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "nonce", value: nonce),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "prompt", value: "select_account"),
        ]
        guard let url = comps.url else { call.reject("Bad request."); return }
        DispatchQueue.main.async {
            let s = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callback, error in
                self?.session = nil
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin { call.resolve(["cancelled": true]); return }
                if let error = error { call.reject(error.localizedDescription, nil, error); return }
                guard let cb = callback, let items = URLComponents(url: cb, resolvingAgainstBaseURL: false)?.queryItems,
                      let code = items.first(where: { $0.name == "code" })?.value,
                      items.first(where: { $0.name == "state" })?.value == state else { call.reject("Google did not return a code."); return }
                self?.exchange(code: code, clientId: clientId, redirect: redirect, verifier: verifier, nonce: nonce, call: call)
            }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = false
            self.session = s
            if !s.start() { call.reject("Could not open the sign-in sheet.") }
        }
    }

    // Any OAuth page in the system sheet, back to the app on its own scheme:
    // ringoesim's Supabase project (APP3) brokers Google with the client the
    // owner set there in June 2026, and lands on com.ringoesim.app://auth/callback
    // with the session in the fragment. openAuth({ url, scheme }) -> { callback }
    @objc func openAuth(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString), let scheme = call.getString("scheme"), !scheme.isEmpty else { call.reject("Bad request."); return }
        DispatchQueue.main.async {
            let s = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callback, error in
                self?.session = nil
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin { call.resolve(["cancelled": true]); return }
                if let error = error { call.reject(error.localizedDescription, nil, error); return }
                guard let cb = callback else { call.reject("The sign-in did not return to the app."); return }
                call.resolve(["callback": cb.absoluteString])
            }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = false
            self.session = s
            if !s.start() { call.reject("Could not open the sign-in sheet.") }
        }
    }

    private func exchange(code: String, clientId: String, redirect: String, verifier: String, nonce: String, call: CAPPluginCall) {
        var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let form = ["code": code, "client_id": clientId, "redirect_uri": redirect, "grant_type": "authorization_code", "code_verifier": verifier]
        req.httpBody = form.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? $0.value)" }.joined(separator: "&").data(using: .utf8)
        URLSession.shared.dataTask(with: req) { data, _, error in
            if let error = error { call.reject(error.localizedDescription, nil, error); return }
            guard let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let idToken = json["id_token"] as? String else {
                call.reject("Google did not return an identity token."); return
            }
            call.resolve(["idToken": idToken, "accessToken": json["access_token"] as? String ?? "", "nonce": nonce])
        }.resume()
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window { return window }
        let windows = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap { $0.windows }
        return windows.first(where: { $0.isKeyWindow }) ?? windows.first ?? ASPresentationAnchor()
    }
}
