import Foundation
import Capacitor
import StoreKit

// Embedded native StoreKit 2 plugin (Capacitor 6 CAPBridgedPlugin, registered in
// MainViewController). Backs the paywall + plan switch: load products, present
// the real purchase sheet, restore, and read active entitlements. Requires
// iOS 15+ (the project's deployment target). Auto-renewable subscriptions live in
// one subscription group, so StoreKit handles upgrade (immediate) / downgrade
// (deferred to renewal) when the user buys a different tier in the same group.
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentEntitlements", returnType: CAPPluginReturnPromise),
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Transactions can arrive outside a direct purchase (renewals, Ask-to-Buy
        // approvals, a purchase made on another device). Finish them so StoreKit
        // stops re-delivering, and tell JS so it can refresh subscription state.
        updatesTask = Task.detached { [weak self] in
            for await update in Transaction.updates {
                guard let self = self else { continue }
                if case .verified(let transaction) = update {
                    await transaction.finish()
                    let payload = self.entitlementDict(transaction)
                    await MainActor.run {
                        self.notifyListeners("transactionUpdated", data: payload)
                    }
                }
            }
        }
    }

    deinit { updatesTask?.cancel() }

    // MARK: - serialization

    private func productDict(_ p: Product) -> [String: Any] {
        return [
            "id": p.id,
            "displayName": p.displayName,
            "description": p.description,
            "displayPrice": p.displayPrice,
            "price": (p.price as NSDecimalNumber).doubleValue,
        ]
    }

    private func entitlementDict(_ t: Transaction) -> [String: Any] {
        var d: [String: Any] = [
            "productId": t.productID,
            "transactionId": String(t.id),
            "originalTransactionId": String(t.originalID),
        ]
        if let exp = t.expirationDate {
            d["expiresDate"] = exp.timeIntervalSince1970 * 1000
        }
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
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        var data = self.entitlementDict(transaction)
                        data["success"] = true
                        data["jws"] = verification.jwsRepresentation
                        await transaction.finish()
                        call.resolve(data)
                    case .unverified(_, let error):
                        call.reject("Purchase could not be verified: \(error.localizedDescription)")
                    }
                case .userCancelled:
                    call.resolve(["cancelled": true])
                case .pending:
                    // Deferred (e.g. Ask-to-Buy) — resolves later via Transaction.updates.
                    call.resolve(["pending": true])
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            try? await AppStore.sync()
            await self.resolveEntitlements(call)
        }
    }

    @objc func currentEntitlements(_ call: CAPPluginCall) {
        Task { await self.resolveEntitlements(call) }
    }

    private func resolveEntitlements(_ call: CAPPluginCall) async {
        var arr: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                arr.append(self.entitlementDict(transaction))
            }
        }
        call.resolve(["entitlements": arr])
    }
}
