export const routes = {
  home: () => '/' as const,
  profile: () => '/profile' as const,
  goingOut: () => '/going-out' as const,
  orders: () => '/orders' as const,
  orderHistory: () => '/order-history' as const,
  messages: () => '/messages' as const,
  earnings: () => '/earnings' as const,
  settings: () => '/settings' as const,
  report: (params?: { requestId?: string; reportedUserId?: string; orderName?: string; prefilledType?: string }) => {
    if (!params) return '/report' as const;
    const query = new URLSearchParams();
    if (params.requestId) query.set('requestId', params.requestId);
    if (params.reportedUserId) query.set('reportedUserId', params.reportedUserId);
    if (params.orderName) query.set('orderName', params.orderName);
    if (params.prefilledType) query.set('prefilledType', params.prefilledType);
    const qs = query.toString();
    return (qs ? `/report?${qs}` : '/report') as any;
  },
  createRequest: () => '/request/create' as const,
  requestDetails: (id: string) => `/request/${id}` as const,
  chat: (id: string) => `/chat/${id}` as const,
  orderStatus: (id: string) => `/order/${id}` as const,
  cravings: () => '/cravings' as const,
  createCraving: () => '/craving/create' as const,
  cravingDetail: (id: string) => `/craving/${id}` as const,
};