export type RequestStatus =
  | 'requested'
  | 'accepted'
  | 'shopping'
  | 'returning'
  | 'delivered'
  | 'completed';

export type RequestCategory = 'food' | 'groceries' | 'stationery' | 'other';

export const CATEGORIES: { key: RequestCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'stationery', label: 'Stationery' },
  { key: 'other', label: 'Other' },
];

export const CATEGORY_EMOJIS: { category: RequestCategory; emoji: string; label: string }[] = [
  { category: 'food', emoji: '🍔', label: 'Food' },
  { category: 'groceries', emoji: '🛒', label: 'Groceries' },
  { category: 'stationery', emoji: '✏️', label: 'Stationery' },
  { category: 'other', emoji: '📦', label: 'Other' },
];

export type DeliveryRequest = {
  id: string;
  itemName: string;
  shop: string;
  emoji: string;
  category: RequestCategory;
  itemBudget: number;
  deliveryFee: number;
  notes: string;
  expiresAt: string;
  status: RequestStatus;
  rating?: number;
  requester: {
    id: string;
    name: string;
    initials: string;
    hostel: string;
    rating: number;
    completedRequests: number;
  };
  accepterId?: string;
};

export function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export const CURRENT_USER = {
  id: 'u1',
  name: 'Aarav Sharma',
  initials: 'AS',
  college: 'Northview College',
  rating: 4.9,
  deliveries: 28,
  earned: 1140,
};

export const initialRequests: DeliveryRequest[] = [
  {
    id: 'r1',
    itemName: 'Veg Whopper meal',
    shop: 'Burger King, City Centre',
    emoji: '🍔',
    category: 'food',
    itemBudget: 200,
    deliveryFee: 40,
    notes: "No onions please. Call when you're at the hostel gate.",
    expiresAt: new Date(Date.now() + 84 * 60 * 1000).toISOString(),
    status: 'requested',
    requester: {
      id: 'u2',
      name: 'Sana Kapoor',
      initials: 'SK',
      hostel: 'Girls Hostel',
      rating: 4.9,
      completedRequests: 12,
    },
  },
  {
    id: 'r2',
    itemName: 'Milk, bread & eggs',
    shop: 'Reliance Smart',
    emoji: '🛒',
    category: 'groceries',
    itemBudget: 320,
    deliveryFee: 35,
    notes: 'Whichever brand is fine.',
    expiresAt: new Date(Date.now() + 47 * 60 * 1000).toISOString(),
    status: 'requested',
    requester: {
      id: 'u3',
      name: 'Rohan V.',
      initials: 'RV',
      hostel: 'Block C',
      rating: 4.7,
      completedRequests: 6,
    },
  },
  {
    id: 'r3',
    itemName: 'Graph notebook & pens',
    shop: 'Campus Stationery',
    emoji: '✏️',
    category: 'stationery',
    itemBudget: 150,
    deliveryFee: 25,
    notes: '2 blue pens, 1 graph notebook.',
    expiresAt: new Date(Date.now() + 110 * 60 * 1000).toISOString(),
    status: 'requested',
    requester: {
      id: 'u4',
      name: 'Aditi M.',
      initials: 'AM',
      hostel: 'Block A',
      rating: 5.0,
      completedRequests: 20,
    },
  },
];

export type EarningsEntry = {
  id: string;
  itemName: string;
  emoji: string;
  forWhom: string;
  date: string;
  amount: number;
};

export const earningsHistory: EarningsEntry[] = [
  { id: 'e1', itemName: 'Margherita Pizza', emoji: '🍕', forWhom: 'Neel', date: '18 Feb', amount: 50 },
  { id: 'e2', itemName: 'Groceries from Smart', emoji: '🛒', forWhom: 'Isha', date: '15 Feb', amount: 40 },
  { id: 'e3', itemName: 'Printouts & stationery', emoji: '📚', forWhom: 'Dev', date: '11 Feb', amount: 30 },
  { id: 'e4', itemName: 'Boba tea order', emoji: '🧋', forWhom: 'Meera', date: '08 Feb', amount: 35 },
];

export type GoingTrip = {
  id: string;
  studentName: string;
  studentInitials: string;
  destination: string;
  leavingAt: string;
  backBy: string;
  isCurrentUser?: boolean;
};

export const initialGoingTrips: GoingTrip[] = [
  {
    id: 'g1',
    studentName: 'Rhea',
    studentInitials: 'RH',
    destination: 'Market Square',
    leavingAt: 'Leaving in 15 min',
    backBy: 'Back by 5:00 PM',
  },
  {
    id: 'g2',
    studentName: 'Kabir',
    studentInitials: 'KB',
    destination: 'City Centre',
    leavingAt: 'Leaving in 30 min',
    backBy: 'Back by 6:15 PM',
  },
];