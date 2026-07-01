import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';

import { useTheme } from '../lib/theme';
import { useOfferings, usePurchasePackage } from '../features/subscription/hooks/useSubscription';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// In-app price labels when the native SDK is unavailable in dev or
// RC is not yet configured — fallback to nominal prices from PRD.
const FALLBACK_PRICE: Record<string, string> = {
  monthly: '₹99/mo',
  annual: '₹799/yr',
};

const PRO_FEATURES = [
  'AI daily analysis — narrative, recommendation, tomorrow\'s focus',
  'Weekly AI report — summary, achievements, areas to improve',
  'Monthly AI report — trends, insights, PDF export & share link',
  'Monthly AI goal generator — personalised targets',
  'Full history & all badges',
];

function PriceChip({ label, highlighted }: { label: string; highlighted: boolean }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: highlighted ? tokens.primary : tokens.surfaceSunken,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 13,
          color: highlighted ? '#FFFFFF' : tokens.ink,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

type PackageRowProps = {
  pkg: PurchasesPackage;
  selected: boolean;
  onSelect: () => void;
};

function PackageRow({ pkg, selected, onSelect }: PackageRowProps) {
  const { tokens } = useTheme();
  const isAnnual = pkg.packageType === PACKAGE_TYPE.ANNUAL;
  const price = pkg.product.priceString || (isAnnual ? FALLBACK_PRICE.annual : FALLBACK_PRICE.monthly);
  const title = isAnnual ? 'Annual' : 'Monthly';
  const saving = isAnnual ? '~33% off vs monthly' : null;

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title} plan, ${price}${saving ? `, ${saving}` : ''}`}
      style={{
        borderWidth: 2,
        borderColor: selected ? tokens.primary : tokens.hairline,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: selected ? `${tokens.primary}0D` : tokens.surface,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? tokens.primary : tokens.inkMuted,
          backgroundColor: selected ? tokens.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: tokens.ink }}>
            {title}
          </Text>
          {isAnnual ? <PriceChip label="Best value" highlighted /> : null}
        </View>
        {saving ? (
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: tokens.inkMuted, marginTop: 2 }}>
            {saving}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: tokens.ink }}>
        {price}
      </Text>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { data: offerings, isLoading: offeringsLoading } = useOfferings();
  const purchasePkg = usePurchasePackage();

  // Prefer annual package as the default selection (APP_FLOW §6: annual highlighted).
  const packages = offerings?.current?.availablePackages ?? [];
  const annualPkg = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
  const monthlyPkg = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(
    annualPkg ?? monthlyPkg ?? null,
  );
  // Update default once packages load.
  if (packages.length > 0 && selectedPkg === null) {
    setSelectedPkg(annualPkg ?? monthlyPkg ?? packages[0]);
  }

  async function handleSubscribe() {
    const pkg = selectedPkg ?? annualPkg ?? monthlyPkg ?? packages[0];
    if (!pkg) {
      Alert.alert('Unavailable', 'Could not load plans. Try again later.');
      return;
    }
    try {
      await purchasePkg.mutateAsync(pkg);
      router.back();
    } catch (err: unknown) {
      const code = (err as { userCancelled?: boolean }).userCancelled;
      if (!code) {
        Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
      }
      // userCancelled = true means the user dismissed the native IAP sheet — no alert needed.
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.canvas }} edges={['top', 'bottom']}>
      {/* Close button */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 16 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={22} color={tokens.inkMuted} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
          <Text
            style={{
              fontFamily: 'Sora_700Bold',
              fontSize: 26,
              color: tokens.primary,
              textAlign: 'center',
            }}
          >
            Unlock Saathi Pro
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 14,
              color: tokens.inkMuted,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            Your personal AI health coach — daily insights, weekly and monthly reports, and goals tailored to your pace.
          </Text>
        </View>

        {/* Feature list */}
        <Card className="gap-3 my-4">
          {PRO_FEATURES.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Check size={16} color={tokens.primary} strokeWidth={2.5} style={{ marginTop: 2 }} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 14,
                  color: tokens.ink,
                  lineHeight: 20,
                }}
              >
                {f}
              </Text>
            </View>
          ))}
        </Card>

        {/* Package selector */}
        {offeringsLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator />
          </View>
        ) : packages.length === 0 ? (
          // Fallback when RC has no offerings configured yet (common in dev).
          <View style={{ gap: 12 }}>
            {(['annual', 'monthly'] as const).map((type) => (
              <View
                key={type}
                style={{
                  borderWidth: 2,
                  borderColor: type === 'annual' ? tokens.primary : tokens.hairline,
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: tokens.surface,
                  opacity: 0.7,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: tokens.ink }}>
                    {type === 'annual' ? 'Annual' : 'Monthly'}
                  </Text>
                  {type === 'annual' ? <PriceChip label="Best value" highlighted /> : null}
                </View>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: tokens.ink }}>
                  {FALLBACK_PRICE[type]}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {annualPkg ? (
              <PackageRow
                pkg={annualPkg}
                selected={selectedPkg?.identifier === annualPkg.identifier}
                onSelect={() => setSelectedPkg(annualPkg)}
              />
            ) : null}
            {monthlyPkg ? (
              <PackageRow
                pkg={monthlyPkg}
                selected={selectedPkg?.identifier === monthlyPkg.identifier}
                onSelect={() => setSelectedPkg(monthlyPkg)}
              />
            ) : null}
          </View>
        )}

        {/* CTA */}
        <View style={{ marginTop: 24, gap: 16 }}>
          <Button
            label={purchasePkg.isPending ? 'Processing…' : 'Start Pro'}
            onPress={handleSubscribe}
            loading={purchasePkg.isPending}
            disabled={packages.length === 0}
            size="lg"
          />

          <Text
            style={{
              textAlign: 'center',
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 11,
              color: tokens.inkMuted,
              lineHeight: 16,
            }}
          >
            Payment charged to your store account on confirmation. Subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your account settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
