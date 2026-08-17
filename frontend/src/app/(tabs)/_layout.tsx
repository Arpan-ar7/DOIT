import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { getConversations, getUnreadCount } from '../../utils/conversations';

export default function TabsLayout() {
  const { requests, messagesByRequest, readStatus } = useRequests();
  const unreadCount = getUnreadCount(getConversations(requests, messagesByRequest, readStatus));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: '#8a9898',
        tabBarStyle: { height: 76, paddingBottom: 10, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      {/* ── Final 4 visible tabs, as agreed ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="going-out"
        options={{
          title: 'Going out',
          tabBarIcon: ({ color, size }) => <Ionicons name="navigate-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── HIDDEN from the tab bar, but still fully reachable ──
          href: null removes the tab button while keeping the screen
          navigable via router.push(). Nothing needed to move — profile.tsx
          and earnings.tsx stay exactly where they are.
          Profile opens from: the avatar on Home.
          Earnings opens from: Profile's own menu ("My earnings & history"). */}
      <Tabs.Screen name="earnings" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}