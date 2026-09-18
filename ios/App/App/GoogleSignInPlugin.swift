import Foundation
import UIKit
import Capacitor
import AuthenticationServices
import CryptoKit
import Network

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
    private var loopback: NWListener?

    // RFC 8252 loopback: while the sheet is open the app answers on
    // http://localhost:<port>, the address Ringo's Supabase project sends a
    // finished sign-in to (its Site URL; only the owner's dashboard could add
    // the app's own scheme to the redirect list). The page served there hands
    // the session fragment to the app's scheme, which the sheet catches.
    private func startLoopback(port: UInt16, scheme: String) -> Bool {
        stopLoopback()
        guard let p = NWEndpoint.Port(rawValue: port), let l = try? NWListener(using: .tcp, on: p) else { return false }
        let target = "\(scheme)://auth/callback"
        let html = "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Ringo</title><body style='font-family:-apple-system,sans-serif;padding:48px 24px;text-align:center;color:#1A0F2E'><p>Back to Ringo\u{2026}</p><p><a id=go href='\(target)' style='color:#F2585F;font-weight:600'>Open Ringo</a></p><script>var f=location.hash||('#'+location.search.slice(1));var u='\(target)'+f;document.getElementById('go').href=u;location.replace(u)</script>"
        let body = Data(html.utf8)
        let head = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: \(body.count)\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
        let reply = Data(head.utf8) + body
        l.newConnectionHandler = { conn in
            conn.start(queue: .global())
            conn.receive(minimumIncompleteLength: 1, maximumLength: 65536) { _, _, _, _ in
                conn.send(content: reply, completion: .contentProcessed { _ in conn.cancel() })
            }
        }
        l.start(queue: .global())
        loopback = l
        return true
    }
    private func stopLoopback() { loopback?.cancel(); loopback = nil }

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
        if let port = call.getInt("loopbackPort"), port > 0, port < 65536, !startLoopback(port: UInt16(port), scheme: scheme) {
            call.reject("Could not open the sign-in return path."); return
        }
        DispatchQueue.main.async {
            let s = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callback, error in
                self?.session = nil
                self?.stopLoopback()
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
