import Foundation
import UIKit
import Capacitor
import UserNotifications

// Embedded native push plugin (Capacitor 6 CAPBridgedPlugin, registered in
// MainViewController). JS asks for permission only after a one-line
// pre-prompt (src/lib/push.ts), never on launch. AppDelegate hands the APNs
// device token here; JS reads it with status() or the 'token' event and
// registers it with ringoesim.com (/api/app-push-register), which is the
// sender. A tap on a push carries an in-app `path` to the 'tap' event.
@objc(NotifyPlugin)
public class NotifyPlugin: CAPPlugin, CAPBridgedPlugin, UNUserNotificationCenterDelegate {
    public let identifier = "NotifyPlugin"
    public let jsName = "Notify"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
    ]

    static let tokenNotification = Notification.Name("RingoAPNsToken")
    static let tokenErrorNotification = Notification.Name("RingoAPNsTokenError")
    private var token: String?
    private var tokenError: String?
    private var pendingTap: [String: Any]?

    override public func load() {
        UNUserNotificationCenter.current().delegate = self
        NotificationCenter.default.addObserver(forName: NotifyPlugin.tokenNotification, object: nil, queue: .main) { [weak self] n in
            guard let self = self, let t = n.object as? String else { return }
            self.token = t
            self.tokenError = nil
            self.notifyListeners("token", data: ["token": t, "environment": NotifyPlugin.environment], retainUntilConsumed: true)
        }
        NotificationCenter.default.addObserver(forName: NotifyPlugin.tokenErrorNotification, object: nil, queue: .main) { [weak self] n in
            self?.tokenError = (n.object as? Error)?.localizedDescription ?? "registration failed"
        }
        // Already allowed on an earlier run: refresh the token quietly (Apple
        // can change it), no dialog.
        UNUserNotificationCenter.current().getNotificationSettings { s in
            if s.authorizationStatus == .authorized || s.authorizationStatus == .provisional {
                DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
            }
        }
    }

    /// Which APNs a token of this build belongs to: an Xcode (development
    /// profile) build is the sandbox; TestFlight and the App Store carry no
    /// development profile and are production.
    static let environment: String = {
        #if targetEnvironment(simulator)
        return "sandbox"
        #else
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .isoLatin1) else { return "production" }
        let pattern = "<key>aps-environment</key>\\s*<string>development</string>"
        return text.range(of: pattern, options: .regularExpression) != nil ? "sandbox" : "production"
        #endif
    }()

    private static func name(_ s: UNAuthorizationStatus) -> String {
        switch s {
        case .authorized: return "granted"
        case .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        default: return "prompt"
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                if granted { UIApplication.shared.registerForRemoteNotifications() }
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { s in
            DispatchQueue.main.async {
                var out: [String: Any] = ["permission": NotifyPlugin.name(s.authorizationStatus), "environment": NotifyPlugin.environment]
                if let t = self.token { out["token"] = t }
                if let e = self.tokenError { out["error"] = e }
                call.resolve(out)
            }
        }
    }

    @objc func register(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
            call.resolve()
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            call.resolve()
        }
    }

    // A push that lands while the app is open still shows as a banner.
    public func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                       withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    // A tap opens the in-app screen the push names (`path`), kept until JS listens.
    public func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                       withCompletionHandler completionHandler: @escaping () -> Void) {
        let info = response.notification.request.content.userInfo
        var data: [String: Any] = [:]
        if let p = info["path"] as? String { data["path"] = p }
        notifyListeners("tap", data: data, retainUntilConsumed: true)
        completionHandler()
    }
}
