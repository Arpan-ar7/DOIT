import { z } from 'zod';

export const reportTypeEnum = z.enum([
  'bug',
  'complaint',
  'query',
  'user_report',
  'payment_issue',
  'other',
]);
export type ReportType = z.infer<typeof reportTypeEnum>;

// Types that reference a specific request are held to the "delivered only" rule.
// bug/query/other are general contact-form style reports with no request context.
const REQUEST_LINKED_TYPES: ReportType[] = ['complaint', 'user_report', 'payment_issue'];
export { REQUEST_LINKED_TYPES };

export const createReportSchema = z.object({
  type: reportTypeEnum,
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  request_id: z.string().uuid().optional(),
  reported_user_id: z.string().uuid().optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export interface ReportRecord {
  id: string;
  user_id: string | null;
  request_id: string | null;
  reported_user_id: string | null;
  type: ReportType;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}