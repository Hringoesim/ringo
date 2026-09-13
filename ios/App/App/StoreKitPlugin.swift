import Foundation
import Capacitor
import StoreKit
import UIKit

// Embedded native StoreKit 2 plugin (Capacitor 6 CAPBridgedPlugin, registered
// in MainViewController). Everything the app sells goes through here: the
// eSIM plans are consumables (one payment) and auto-renewable subscriptions
// (the renewing regional plans), top-ups are consumables.
//
// A purchase is NOT finished here. The signed transaction (jwsRepresentation)
// goes to ringoesim.com, which verifies it against Apple's roots and issues
// the eSIM; only then does JS call finish(). If the app dies in between,
// StoreKit redelivers the unfinished transaction on the next launch through
// Transaction.updates / Transaction.unfinished, which are forwarded to JS as
// "transaction" events, so nothing paid for is ever lost.
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unfinished", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise),
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Renewals, Ask-to-Buy approvals, purchases made on another device and
        // transactions left unfinished by a crash all arrive here. They are
        // handed to JS unfinished; JS records them with the server and
        // finishes them.
        updatesTask = Task.detached { [weak self] in
            for await update in Transaction.updates {
                guard let self = self else { continue }
                if case .verified(let transaction) = update {
                    let payload = self.transactionDict(transaction, jws: update.jwsRepresentation)
                    await MainActor.run { self.notifyListeners("transaction", data: payload) }
                }
            }
        }
    }

    deinit { updatesTask?.cancel() }

    // MARK: - serialization

    private func productDict(_ p: Product) -> [String: Any] {
        var d: [String: Any] = [
            "id": p.id,
            "displayName": p.displayName,
            "description": p.description,
            "displayPrice": p.displayPrice,
            "price": (p.price as NSDecimalNumber).doubleValue,
            "currency": p.priceFormatStyle.currencyCode,
            "type": p.type == .autoRenewable ? "subscription" : (p.type == .consumable ? "consumable" : "other"),
        ]
        if let sub = p.subscription {
            let period = sub.subscriptionPeriod
            let unit: String
            switch period.unit {
            case .day: unit = "day"
            case .week: unit = "week"
            case .month: unit = "month"
            case .year: unit = "year"
            @unknown default: unit = "unknown"
            }
            d["subscriptionPeriod"] = ["unit": unit, "value": period.value]
        }
        return d
    }

    private func transactionDict(_ t: Transaction, jws: String) -> [String: Any] {
        var d: [String: Any] = [
            "productId": t.productID,
            "transactionId": String(t.id),
            "originalTransactionId": String(t.originalID),
            "jws": jws,
            "purchaseDate": t.purchaseDate.timeIntervalSince1970 * 1000,
        ]
        if let exp = t.expirationDate { d["expiresDate"] = exp.timeIntervalSince1970 * 1000 }
        if let rev = t.revocationDate { d["revocationDate"] = rev.timeIntervalSince1970 * 1000 }
        d["environment"] = t.environment == .production ? "Production" : (t.environment == .sandbox ? "Sandbox" : "Xcode")
        return d
    }

    // MARK: - methods

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids)
                call.resolve(["products": products.map { self.productDict($0) }])
            } catch {
                call.reject("Could not load products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        let token = call.getString("appAccountToken").flatMap { UUID(uuidString: $0) }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }
                var options: Set<Product.PurchaseOption> = []
                if let token = token { options.insert(.appAccountToken(token)) }
                let result = try await product.purchase(options: options)
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        var data = self.transactionDict(transaction, jws: verification.jwsRepresentation)
                        data["state"] = "purchased"
                        call.resolve(data)
                    case .unverified(_, let error):
                        call.reject("Purchase could not be verified: \(error.localizedDescription)")
                    }
                case .userCancelled:
                    call.resolve(["state": "cancelled"])
                case .pending:
                    // Ask to Buy or SCA: the transaction arrives later via Transaction.updates.
                    call.resolve(["state": "pending"])
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // Called once the server has recorded the transaction and issued the eSIM.
    @objc func finish(_ call: CAPPluginCall) {
        guard let idStr = call.getString("transactionId"), let id = UInt64(idStr) else {
            call.reject("transactionId is required")
            return
        }
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let t) = result, t.id == id {
                    await t.finish()
                    call.resolve(["finished": true])
                    return
                }
            }
            // Already finished, or never ours: nothing to do.
            call.resolve(["finished": false])
        }
    }

    // Transactions paid for but not yet reported to the server.
    @objc func unfinished(_ call: CAPPluginCall) {
        Task {
            var arr: [[String: Any]] = []
            for await result in Transaction.unfinished {
                if case .verified(let t) = result {
                    arr.append(self.transactionDict(t, jws: result.jwsRepresentation))
                }
            }
            call.resolve(["transactions": arr])
        }
    }

    // Everything this Apple ID ever bought in this app, newest first: what
    // "Restore purchases" hands to the server to find the eSIMs again.
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            try? await AppStore.sync()
            var arr: [[String: Any]] = []
            for await result in Transaction.all {
                if case .verified(let t) = result {
                    arr.append(self.transactionDict(t, jws: result.jwsRepresentation))
                }
            }
            arr.sort { ($0["purchaseDate"] as? Double ?? 0) > ($1["purchaseDate"] as? Double ?? 0) }
            call.resolve(["transactions": Array(arr.prefix(20))])
        }
    }

    @objc func currentEntitlements(_ call: CAPPluginCall) {
        Task {
            var arr: [[String: Any]] = []
            for await result in Transaction.currentEntitlements {
                if case .verified(let t) = result {
                    arr.append(self.transactionDict(t, jws: result.jwsRepresentation))
                }
            }
            call.resolve(["entitlements": arr])
        }
    }

    // iOS's own subscription management sheet (cancel, change plan).
    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                do {
                    try await AppStore.showManageSubscriptions(in: scene)
                    call.resolve(["shown": true])
                    return
                } catch {
                    // fall through to the App Store URL
                }
            }
            if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                await UIApplication.shared.open(url)
            }
            call.resolve(["shown": false])
        }
    }
}
