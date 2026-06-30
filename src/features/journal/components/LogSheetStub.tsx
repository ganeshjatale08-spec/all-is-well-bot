import type { ComponentType } from 'react';
import { useRouter } from 'expo-router';

import { Screen } from '../../../components/ui/Screen';
import { EmptyState } from '../../../components/ui/EmptyState';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type LogSheetStubProps = {
  icon: IconComponent;
  title: string;
};

// Placeholder modal — the real log sheets (form + offline-first write) are
// built in the next Phase 3 task. This exists so /log/* routes resolve now
// that the ⊕ action sheet links to them.
export function LogSheetStub({ icon, title }: LogSheetStubProps) {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState
        icon={icon}
        title={title}
        description="This log sheet is coming soon."
        ctaLabel="Close"
        onPressCta={() => router.back()}
      />
    </Screen>
  );
}
