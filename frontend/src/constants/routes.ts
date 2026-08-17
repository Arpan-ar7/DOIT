export const routes = {
  home: () => '/' as const,
  profile: () => '/profile' as const,
  goingOut: () => '/going-out' as const,
  orders: () => '/orders' as const, // NEW
  messages: () => '/messages' as const,
  earnings: () => '/earnings' as const,
  settings: () => '/settings' as const,
  createRequest: () => '/request/create' as const,
  requestDetails: (id: string) => `/request/${id}` as const,
  chat: (id: string) => `/chat/${id}` as const,
  orderStatus: (id: string) => `/order/${id}` as const,
};