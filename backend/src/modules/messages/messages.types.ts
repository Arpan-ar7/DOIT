import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const requestIdParamSchema = z.object({
  requestId: z.string().uuid('Invalid request id'),
});

export interface MessageRecord {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}