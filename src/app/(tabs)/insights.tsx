import { ChartLine } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { EmptyState } from '../../components/ui/EmptyState';

// Insights (trend charts, weekly/monthly reports) is Phase 5 scope —
// PROGRESS.md. This stub only exists so the tab route resolves.
export default function Insights() {
  return (
    <Screen>
      <EmptyState icon={ChartLine} title="Insights coming soon" description="Trends and reports will live here." />
    </Screen>
  );
}
