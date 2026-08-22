export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type RequestCategory = 'food' | 'groceries' | 'stationery' | 'pharmacy' | 'print' | 'other';

export const CATEGORIES: { key: RequestCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'stationery', label: 'Stationery' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'print', label: 'Print & Docs' },
  { key: 'other', label: 'Other' },
];

export const CATEGORY_EMOJIS: { category: RequestCategory; emoji: string; label: string }[] = [
  { category: 'food', emoji: '🍔', label: 'Food' },
  { category: 'groceries', emoji: '🛒', label: 'Groceries' },
  { category: 'stationery', emoji: '✏️', label: 'Stationery' },
  { category: 'pharmacy', emoji: '💊', label: 'Pharmacy' },
  { category: 'print', emoji: '🖨️', label: 'Print' },
  { category: 'other', emoji: '📦', label: 'Other' },
];

export type ExpiryOption = { hours: number; label: string };
export const EXPIRY_OPTIONS: ExpiryOption[] = [
  { hours: 1, label: '1h' },
  { hours: 2, label: '2h' },
  { hours: 4, label: '4h' },
  { hours: 6, label: '6h' },
];
export const DEFAULT_EXPIRY_HOURS = 4;
export const DEFAULT_DELIVERY_FEE = 10;

// NEW — describes the person who accepted a request, from the REQUESTER's
// point of view. Only gets attached to a request once someone accepts it.
// phone is only ever shown on-screen if sharePhone is true — see order/[id].tsx.
export type Accepter = {
  name: string;
  initials: string;
  rating: number;
  completedRequests: number;
  phone: string;
  sharePhone: boolean;
};

export type DeliveryRequest = {
  id: string;
  itemName: string;
  shop: string;
  emoji: string;
  category: RequestCategory;
  itemBudget: number;
  deliveryFee: number;
  notes: string;
  deliveryLocation: string;
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
  accepter?: Accepter; // NEW — populated once accepted; undefined until then
};

export function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export const CURRENT_USER = {
  id: 'u1',
  name: 'Aarav Sharma',
  initials: 'AS',
  college: 'Northview College',
  rating: 0,
  deliveries: 0,
  earned: 0,
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
    deliveryLocation: 'Girls Hostel, Main Gate',
    expiresAt: new Date(Date.now() + 84 * 60 * 1000).toISOString(),
    status: 'pending',
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
    deliveryLocation: 'Block C, Room 214',
    expiresAt: new Date(Date.now() + 47 * 60 * 1000).toISOString(),
    status: 'pending',
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
    deliveryLocation: 'Block A, Room 108',
    expiresAt: new Date(Date.now() + 110 * 60 * 1000).toISOString(),
    status: 'pending',
    requester: {
      id: 'u4',
      name: 'Aditi M.',
      initials: 'AM',
      hostel: 'Block A',
      rating: 5.0,
      completedRequests: 20,
    },
  },
  // ── DEMO SEEDS — two of YOUR OWN requests, already accepted by a mock
  // student, so you can see the "reveal delivery partner" feature working
  // right away without needing a second real device. Delete these once
  // real acceptances start happening through the backend.
  {
    id: 'r4',
    itemName: 'Cold coffee & sandwich',
    shop: 'Cafe Coffee Day',
    emoji: '🍔',
    category: 'food',
    itemBudget: 180,
    deliveryFee: 30,
    notes: 'Less sugar please.',
    deliveryLocation: 'Boys Hostel, Room 305',
    expiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'in_progress',
    requester: {
      id: CURRENT_USER.id,
      name: CURRENT_USER.name,
      initials: CURRENT_USER.initials,
      hostel: 'My Hostel',
      rating: CURRENT_USER.rating,
      completedRequests: CURRENT_USER.deliveries,
    },
    accepterId: 'u9',
    accepter: {
      name: 'Priya Malhotra',
      initials: 'PM',
      rating: 4.8,
      completedRequests: 15,
      phone: '9123456780',
      sharePhone: true, // demonstrates the phone number BEING shown
    },
  },
  {
    id: 'r5',
    itemName: 'Printouts for assignment',
    shop: '',
    emoji: '🖨️',
    category: 'print',
    itemBudget: 40,
    deliveryFee: 20,
    notes: '',
    deliveryLocation: 'Block A, Room 108',
    expiresAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    status: 'completed',
    requester: {
      id: CURRENT_USER.id,
      name: CURRENT_USER.name,
      initials: CURRENT_USER.initials,
      hostel: 'My Hostel',
      rating: CURRENT_USER.rating,
      completedRequests: CURRENT_USER.deliveries,
    },
    accepterId: 'u10',
    accepter: {
      name: 'Karan Mehta',
      initials: 'KM',
      rating: 4.6,
      completedRequests: 9,
      phone: '9988776655',
      sharePhone: false, // demonstrates the phone number BEING hidden
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

export const earningsHistory: EarningsEntry[] = [];

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

export const TAKEN_USERNAMES: string[] = [
  'sana_kapoor',
  'rohan_v',
  'aditi_m',
  'rhea',
  'kabir',
  'admin',
  'support',
  'campuscarry',
];