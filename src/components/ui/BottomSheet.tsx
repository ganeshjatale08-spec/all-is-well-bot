import { Modal, Pressable, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BottomSheetProps = ViewProps & {
  visible: boolean;
  onClose: () => void;
};

/**
 * Modal-based bottom sheet (no @gorhom/bottom-sheet dependency installed) —
 * transparent slide-up Modal with a dismiss backdrop. FRONTEND_DESIGN §5.
 */
export function BottomSheet({ visible, onClose, className = '', children, ...viewProps }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-ink/40"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} className="rounded-t-sheet bg-surface">
            <View className={`p-4 ${className}`} {...viewProps}>
              {children}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
