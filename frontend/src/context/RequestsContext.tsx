import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  DeliveryRequest,
  RequestStatus,
  RequestCategory,
  GoingTrip,
  initialRequests,
  initialGoingTrips,
  CURRENT_USER,
} from '../constants/mockData';
import { formatClockTime } from '../utils/time';

export type ChatMessage = {
  id: string;
  requestId: string;
  fromMe: boolean;
  text: string;
  time: string;
  createdAt: number;
};

type NewRequestInput = {
  itemName: string;
  shop: string;
  emoji: string;
  category: RequestCategory;
  itemBudget: number;
  deliveryFee: number;
  notes: string;
};

type NewTripInput = {
  destination: string;
  leavingAt: string;
  backBy: string;
};

type RequestsContextValue = {
  requests: DeliveryRequest[];
  messagesByRequest: Record<string, ChatMessage[]>;
  goingTrips: GoingTrip[];
  readStatus: Record<string, number>;
  createRequest: (input: NewRequestInput) => void;
  cancelRequest: (requestId: string) => void;
  acceptRequest: (requestId: string) => void;
  advanceStatus: (requestId: string) => void;
  rateRequest: (requestId: string, rating: number) => void;
  sendMessage: (requestId: string, text: string, fromMe?: boolean) => void;
  seedConversation: (requestId: string, requesterFirstName: string) => void;
  markRead: (requestId: string) => void;
  announceTrip: (input: NewTripInput) => void;
  getRequestById: (id: string) => DeliveryRequest | undefined;
};

const STATUS_ORDER: RequestStatus[] = [
  'requested',
  'accepted',
  'shopping',
  'returning',
  'delivered',
  'completed',
];

const RequestsContext = createContext<RequestsContextValue | undefined>(undefined);

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<DeliveryRequest[]>(initialRequests);
  const [messagesByRequest, setMessagesByRequest] = useState<Record<string, ChatMessage[]>>({});
  const [goingTrips, setGoingTrips] = useState<GoingTrip[]>(initialGoingTrips);
  const [readStatus, setReadStatus] = useState<Record<string, number>>({});

  function createRequest(input: NewRequestInput) {
    const newRequest: DeliveryRequest = {
      id: `r${Date.now()}`,
      ...input,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'requested',
      requester: {
        id: CURRENT_USER.id,
        name: CURRENT_USER.name,
        initials: CURRENT_USER.initials,
        hostel: 'My Hostel',
        rating: CURRENT_USER.rating,
        completedRequests: CURRENT_USER.deliveries,
      },
    };
    setRequests((prev) => [newRequest, ...prev]);
  }

  function cancelRequest(requestId: string) {
    setRequests((prev) =>
      prev.filter((r) => !(r.id === requestId && r.requester.id === CURRENT_USER.id && r.status === 'requested')),
    );
  }

  function acceptRequest(requestId: string) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status: 'accepted', accepterId: CURRENT_USER.id } : r,
      ),
    );
  }

  function advanceStatus(requestId: string) {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const currentIndex = STATUS_ORDER.indexOf(r.status);
        const next = STATUS_ORDER[Math.min(currentIndex + 1, STATUS_ORDER.length - 1)];
        return { ...r, status: next };
      }),
    );
  }

  function rateRequest(requestId: string, rating: number) {
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, rating } : r)));
  }

  function sendMessage(requestId: string, text: string, fromMe: boolean = true) {
    const now = Date.now();
    const message: ChatMessage = {
      id: `m${now}-${Math.random().toString(36).slice(2, 6)}`,
      requestId,
      fromMe,
      text,
      time: formatClockTime(new Date(now)),
      createdAt: now,
    };
    setMessagesByRequest((prev) => ({
      ...prev,
      [requestId]: [...(prev[requestId] ?? []), message],
    }));
  }

  function seedConversation(requestId: string, requesterFirstName: string) {
    setMessagesByRequest((prev) => {
      if (prev[requestId]?.length) return prev;
      const now = Date.now();
      const seedMessage: ChatMessage = {
        id: `seed-${requestId}`,
        requestId,
        fromMe: false,
        text: `Hi! Thanks for accepting my request 😊`,
        time: formatClockTime(new Date(now)),
        createdAt: now,
      };
      return { ...prev, [requestId]: [seedMessage] };
    });
  }

  function markRead(requestId: string) {
    setReadStatus((prev) => ({ ...prev, [requestId]: Date.now() }));
  }

  function announceTrip(input: NewTripInput) {
    const trip: GoingTrip = {
      id: `g${Date.now()}`,
      studentName: CURRENT_USER.name,
      studentInitials: CURRENT_USER.initials,
      isCurrentUser: true,
      ...input,
    };
    setGoingTrips((prev) => [trip, ...prev]);
  }

  function getRequestById(id: string) {
    return requests.find((r) => r.id === id);
  }

  return (
    <RequestsContext.Provider
      value={{
        requests,
        messagesByRequest,
        goingTrips,
        readStatus,
        createRequest,
        cancelRequest,
        acceptRequest,
        advanceStatus,
        rateRequest,
        sendMessage,
        seedConversation,
        markRead,
        announceTrip,
        getRequestById,
      }}
    >
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used inside <RequestsProvider>');
  return ctx;
}