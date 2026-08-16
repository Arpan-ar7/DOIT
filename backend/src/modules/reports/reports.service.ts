import { supabaseClient } from '../../config/supabaseClient.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { REQUEST_LINKED_TYPES } from './reports.types.js';
import type { CreateReportInput, ReportRecord } from './reports.types.js';

/**
 * Create a report.
 *
 * GATING RULE: if the report is tied to a specific request AND the report
 * type is one of complaint / user_report / payment_issue, the request MUST
 * be 'completed' (marked delivered) before the report can be filed.
 *
 * bug / query / other reports don't require a request at all.
 */
export async function createReport(
  userId: string,
  payload: CreateReportInput
): Promise<ReportRecord> {
  if (payload.request_id && REQUEST_LINKED_TYPES.includes(payload.type)) {
    const { data: request, error: requestError } = await supabaseClient
      .from('requests')
      .select('id, status, requester_id, deliverer_id')
      .eq('id', payload.request_id)
      .single();

    if (requestError || !request) {
      throw new AppError(404, 'Referenced request not found');
    }

    const isParticipant = request.requester_id === userId || request.deliverer_id === userId;
    if (!isParticipant) {
      throw new AppError(403, 'You are not a participant in this request');
    }

    if (request.status !== 'completed') {
      throw new AppError(
        400,
        'You can only file this type of report after the request has been marked delivered/completed'
      );
    }
  }

  const { data, error } = await supabaseClient
    .from('reports')
    .insert({
      user_id: userId,
      request_id: payload.request_id ?? null,
      reported_user_id: payload.reported_user_id ?? null,
      type: payload.type,
      subject: payload.subject,
      description: payload.description,
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'Failed to create report');
    throw new AppError(500, 'Failed to create report');
  }

  return data as ReportRecord;
}

export async function getMyReports(userId: string): Promise<ReportRecord[]> {
  const { data, error } = await supabaseClient
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch reports');
    throw new AppError(500, 'Failed to fetch reports');
  }

  return data as ReportRecord[];
}