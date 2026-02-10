import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ACCENT = { light: '#B86F4A', dark: '#D4A574' };
const ACCENT_BG = {
  light: 'rgba(184, 111, 74, 0.12)',
  dark: 'rgba(212, 165, 116, 0.15)',
};

export default function TodoScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const accentBg = ACCENT_BG[colorScheme];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
            <IconSymbol
              name="list.bullet"
              size={64}
              color={ACCENT[colorScheme]}
              style={styles.icon}
            />
          </View>
          <ThemedText type="title" style={styles.title}>
            待办事项
          </ThemedText>
          <ThemedText style={styles.subtitle}>占位页面，敬请期待</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {},
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.75,
  },
});
