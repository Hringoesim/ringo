import Foundation
import Capacitor
import CoreLocation

// Embedded location plugin (owner 2026-10-24: "geolocation on the app so we
// can send personalised push notifications"). While Using only, reduced
// accuracy is enough, and the phone turns the fix into a country code itself
// (CLGeocoder): the code is all JS ever gets and all ringoesim.com stores.
// Asked once, from JS, right after a yes to notifications; never at launch.
@objc(LocationPlugin)
public class LocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "LocationPlugin"
    public let jsName = "Location"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "country", returnType: CAPPluginReturnPromise),
    ]

    private var manager: CLLocationManager?
    private var authCalls: [CAPPluginCall] = []
    private var fixCalls: [CAPPluginCall] = []

    private func mgr() -> CLLocationManager {
        if let m = manager { return m }
        let m = CLLocationManager()
        m.delegate = self
        m.desiredAccuracy = kCLLocationAccuracyReduced
        manager = m
        return m
    }

    private static func word(_ s: CLAuthorizationStatus) -> String {
        switch s {
        case .authorizedWhenInUse, .authorizedAlways: return "granted"
        case .denied, .restricted: return "denied"
        default: return "prompt"
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["permission": LocationPlugin.word(self.mgr().authorizationStatus)]) }
    }

    // { ask: true } raises the While Using dialog when iOS has not asked yet.
    @objc func country(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let m = self.mgr()
            switch m.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways:
                self.fixCalls.append(call)
                m.requestLocation()
            case .notDetermined where call.getBool("ask") == true:
                self.authCalls.append(call)
                m.requestWhenInUseAuthorization()
            default:
                call.resolve(["permission": LocationPlugin.word(m.authorizationStatus)])
            }
        }
    }

    public func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        let s = m.authorizationStatus
        if s == .notDetermined || authCalls.isEmpty { return }
        let waiting = authCalls
        authCalls = []
        if s == .authorizedWhenInUse || s == .authorizedAlways {
            fixCalls.append(contentsOf: waiting)
            m.requestLocation()
        } else {
            waiting.forEach { $0.resolve(["permission": LocationPlugin.word(s)]) }
        }
    }

    public func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        let waiting = fixCalls
        fixCalls = []
        if waiting.isEmpty { return }
        CLGeocoder().reverseGeocodeLocation(loc) { marks, _ in
            var out: [String: Any] = ["permission": "granted"]
            if let iso = marks?.first?.isoCountryCode { out["country"] = iso }
            waiting.forEach { $0.resolve(out) }
        }
    }

    public func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        let waiting = fixCalls
        fixCalls = []
        waiting.forEach { $0.resolve(["permission": LocationPlugin.word(m.authorizationStatus)]) }
    }
}
