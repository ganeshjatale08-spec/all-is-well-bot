import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

// RevenueCat entitlement identifier — must match the entitlement created in
// the RevenueCat dashboard (https://app.revenuecat.com). We use 'pro' for the
// Pro plan; Family/Advanced are schema-ready but not purchasable in MVP.
export const PRO_ENTITLEMENT_ID = 'pro';

// Tracks whether Purchases.configure() has been called in this app session.
// Purchases.isConfigured is async in v10, so we maintain a local flag instead
// of awaiting it on every guard check.
let _configured = false;

// Call once at app startup — before user logs in. RevenueCat creates an
// anonymous app_user_id until logInPurchases() links the identified user.
export function configurePurchases(): void {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return; // no key in env (dev env without RC credentials) — no-op
  if (_configured) return;
  Purchases.configure({ apiKey });
  _configured = true;
}

// After Supabase sign-in: identify RC user with our own auth.users.id so that
// the webhook's app_user_id maps directly to our DB user row without a lookup.
export async function loginPurchases(userId: string): Promise<void> {
  if (!_configured) return;
  try {
    await Purchases.logIn(userId);
  } catch {
    // Non-fatal: entitlement defaults to free if RC is unreachable.
  }
}

// On Supabase sign-out: revert RC to anonymous identity so no purchase state
// leaks between accounts on shared devices.
export async function logoutPurchases(): Promise<void> {
  if (!_configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // Non-fatal.
  }
}

// Returns true if the 'pro' entitlement (or any Pro+ plan) is active
// according to RevenueCat's local cached CustomerInfo. Used as an
// optimistic unlock signal immediately after purchase.
export function rcIsProActive(info: CustomerInfo): boolean {
  return !!info.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive;
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (!_configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export { Purchases };
