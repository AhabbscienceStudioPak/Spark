import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth.store';
import { initLocalStorage } from '../services/local-storage.service';

export default function RootLayout(): ReactElement {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    // Init local SQLite DB and restore any saved session
    void initLocalStorage();
    void restoreSession();
  }, [restoreSession]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth screens — no header */}
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        {/* Main app */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="offer/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="checkout/[token]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
