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
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}