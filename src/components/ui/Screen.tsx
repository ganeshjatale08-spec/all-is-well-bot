import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
};

/** Safe-area + canvas background + optional scroll, per FRONTEND_DESIGN §5. */
export function Screen({ children, scroll = false, className = '' }: ScreenProps) {
  const Content = scroll ? ScrollView : View;
  const contentProps = scroll
    ? { contentContainerClassName: `flex-grow px-5 py-5 ${className}`, keyboardShouldPersistTaps: 'handled' as const }
    : { className: `flex-1 px-5 py-5 ${className}` };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Content {...contentProps}>{children}</Content>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
