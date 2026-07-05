import Foundation
import UIKit
import Capacitor
import UserNotifications

// Embedded native notification-permission plugin (Capacitor 6 CAPBridgedPlugin,
// registered in MainViewController). Used by the notification pre-prompt screen
// to raise the real iOS permission dialog after we've explained the value.
@objc(NotifyPlugin)
public class NotifyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NotifyPlugin"
    public let jsName = "Notify"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
    ]

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                if granted { UIApplication.shared.registerForRemoteNotifications() }
                call.resolve(["granted": granted])
            }
        }
    }
}
