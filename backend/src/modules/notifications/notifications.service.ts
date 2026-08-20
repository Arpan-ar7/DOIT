import { supabaseClient } from '../../config/supabaseClient.js';
import { getMessagingClient } from '../../config/firebaseAdmin.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import type {
  DeviceTokenRecord,
  NotificationRecord,
  NotificationType,
  RegisterTokenInput,
} from './notifications.types.js';

export async function registerDeviceToken(
  userId: string,
  payload: RegisterTokenInput
): Promise<DeviceTokenRecord> {
  const { data, error } = await supabaseClient
    .from('device_tokens')
    .upsert(
      {
        user_id: userId,
        fcm_token: payload.fcm_token,
        platform: payload.platform,
        device_label: payload.device_label ?? null,
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'fcm_token' }
    )
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'Failed to register device token');
    throw new AppError(500, 'Failed to register device token');
  }

  return data as DeviceTokenRecord;
}

export async function unregisterDeviceToken(userId: string, fcmToken: string): Promise<void> {
  const { error } = await supabaseClient
    .from('device_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('fcm_token', fcmToken);

  if (error) {
    logger.error({ err: error }, 'Failed to unregister device token');
    throw new AppError(500, 'Failed to unregister device token');
  }
}

export async function sendPush(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  relatedRequestId?: string
): Promise<NotificationRecord> {
  const { data: logged, error: logError } = await supabaseClient
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      related_request_id: relatedRequestId ?? null,
    })
    .select()
    .single();

  if (logError) {
    logger.error({ err: logError }, 'Failed to log notification');
    throw new AppError(500, 'Failed to log notification');
  }

  const { data: tokens, error: tokensError } = await supabaseClient
    .from('device_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (tokensError) {
    logger.error({ err: tokensError }, 'Failed to fetch device tokens');
    return logged as NotificationRecord;
  }

  if (!tokens || tokens.length === 0) {
    logger.info({ userId }, 'No active device tokens — notification logged but not pushed');
    return logged as NotificationRecord;
  }

  const messaging = getMessagingClient();
  const fcmTokens = tokens.map((t) => t.fcm_token as string);

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body },
      data: relatedRequestId ? { request_id: relatedRequestId, type } : { type },
    });

    const deadTokens: string[] = [];
    response.responses.forEach((res, i) => {
      if (!res.success) {
        const errCode = res.error?.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token'
        ) {
          deadTokens.push(fcmTokens[i] as string);
        }
      }
    });

    if (deadTokens.length > 0) {
      await supabaseClient
        .from('device_tokens')
        .update({ is_active: false })
        .in('fcm_token', deadTokens);
    }

    logger.info(
      { userId, success: response.successCount, failure: response.failureCount },
      'Push notification sent'
    );

    // TEMP DEBUG: log the actual reason for any failures.
    response.responses.forEach((res, i) => {
      if (!res.success) {
        logger.error(
          { token: fcmTokens[i], errorCode: res.error?.code, errorMessage: res.error?.message },
          'Individual push failed'
        );
      }
    });
  } catch (err) {
    logger.error({ err }, 'Failed to send push notification');
  }

  return logged as NotificationRecord;
}

export async function getMyNotifications(userId: string): Promise<NotificationRecord[]> {
  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch notifications');
    throw new AppError(500, 'Failed to fetch notifications');
  }

  return data as NotificationRecord[];
}