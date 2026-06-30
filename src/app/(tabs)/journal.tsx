import { BookOpen } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { EmptyState } from '../../components/ui/EmptyState';

// Placeholder — full Journal screen (date switcher + entries by category) is
// built in the next Phase 3 task (APP_FLOW §1, §2).
export default function Journal() {
  return (
    <Screen>
      <EmptyState
        icon={BookOpen}
        title="Journal is coming together"
        description="Your day's entries will show up here soon."
      />
    </Screen>
  );
}
