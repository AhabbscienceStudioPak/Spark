import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { colors } from '../../theme/tokens';

function TabIcon({ emoji }: { emoji: string }): ReactElement {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabLayout(): ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Offers',
          tabBarIcon: ({ focused }) => <TabIcon emoji={focused ? '🏷️' : '🏷'} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused }) => <TabIcon emoji={focused ? '💳' : '💳'} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon emoji={focused ? '📋' : '📋'} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji={focused ? '⚙️' : '⚙️'} />,
        }}
      />
    </Tabs>
  );
}
