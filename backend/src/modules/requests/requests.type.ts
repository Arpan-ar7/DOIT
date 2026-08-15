import { z } from 'zod';

// Matches the request_status enum in the database exactly.
export const requestStatusEnum = z.enum([
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
]);
export type RequestStatus = z.infer<typeof requestStatusEnum>;

// ---------------------------------------------------------------------
// POST /api/v1/requests — create a new request
// ---------------------------------------------------------------------
export const createRequestSchema = z.object({
  item_name: z.string().min(1, 'item_name is required'),
  category: z.string().optional(),
  approximate_price: z.number().nonnegative().optional(),
  delivery_fee: z.number().nonnegative().default(0),
  images: z.array(z.string()).default([]),
  notes: z.string().optional(),
  pickup_location: z.string().min(1, 'pickup_location is required'),
  dropoff_location: z.string().min(1, 'dropoff_location is required'),
  needed_by: z.string().datetime().optional(),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// ---------------------------------------------------------------------
// POST /api/v1/requests/:id/cancel
// ---------------------------------------------------------------------
export const cancelRequestSchema = z.object({
  reason: z.string().optional(),
});
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;

// ---------------------------------------------------------------------
// GET /api/v1/requests/:id, POST /api/v1/requests/:id/accept, etc.
// ---------------------------------------------------------------------
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid request id'),
});

// ---------------------------------------------------------------------
// GET /api/v1/requests/mine?role=requester|deliverer
// ---------------------------------------------------------------------
export const myRequestsQuerySchema = z.object({
  role: z.enum(['requester', 'deliverer']).default('requester'),
});

// Shape of a row as it actually comes back from the `requests` table.
export interface RequestRecord {
  id: string;
  item_name: string;
  category: string | null;
  approximate_price: number | null;
  actual_price: number | null;
  delivery_fee: number;
  images: string[];
  notes: string | null;
  pickup_location: string;
  dropoff_location: string;
  needed_by: string | null;
  expires_at: string;
  requester_id: string;
  deliverer_id: string | null;
  status: RequestStatus;
  payment_status: string;
  payment_method: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}