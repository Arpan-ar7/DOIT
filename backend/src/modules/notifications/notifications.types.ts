import { z } from 'zod';

export const platformEnum = z.enum(['ios', 'android', 'web']);

export const registerTokenSchema = z.object({
  fcm_token: z.string().min(1),
  platform: platformEnum,
  device_label: z.string().optional(),
});
export type RegisterTokenInput = z.infer<typeof registerTokenSchema>;

export const unregisterTokenSchema = z.object({
  fcm_token: z.string().min(1),
});
export type UnregisterTokenInput = z.infer<typeof unregisterTokenSchema>;

export const sendTestPushSchema = z.object({
  title: z.string().min(1).default('Test notification'),
  body: z.string().min(1).default('This is a test push from the backend'),
});
export type SendTestPushInput = z.infer<typeof sendTestPushSchema>;

export interface DeviceTokenRecord {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: 'ios' | 'android' | 'web';
  device_label: string | null;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
}

export type NotificationType =
  | 'request_accepted'
  | 'request_cancelled'
  | 'request_expired'
  | 'deliverer_arrived'
  | 'item_delivered'
  | 'payment_confirmed'
  | 'new_message'
  | 'rating_received'
  | 'going_out_nearby'
  | 'report_update'
  | 'system';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_request_id: string | null;
  is_read: boolean;
  created_at: string;
}