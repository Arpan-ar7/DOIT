import { apiRequest } from './apiClient';

export type ReportType = 'bug' | 'complaint' | 'query' | 'user_report' | 'payment_issue' | 'other';

export type SubmitReportBody = {
  type: ReportType;
  subject: string;
  description: string;
  request_id?: string;
  reported_user_id?: string;
};

export function submitReportApi(body: SubmitReportBody) {
  return apiRequest<{ id: string }>('/reports', { method: 'POST', body });
}

export function getMyReportsApi() {
  return apiRequest<{ id: string; type: string; subject: string; status: string; created_at: string }[]>('/reports/mine');
}
