import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji }: { emoji: string }): JSX.Element {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2D6A4F',
        tabBarInactiveTintColor: '#ADB5BD',
        tabBarStyle: { paddingBottom: 4 },
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
