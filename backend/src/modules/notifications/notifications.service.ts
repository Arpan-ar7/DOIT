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

export interface BroadcastNewRequestInput {
  requesterId: string;
  requestId: string;
  itemName: string;
  deliveryFee: number;
  dropoffLocation?: string | undefined;
  collegeId?: string | undefined;
}

export async function broadcastNewRequestNotification(
  input: BroadcastNewRequestInput
): Promise<void> {
  const { requesterId, requestId, itemName, deliveryFee, dropoffLocation, collegeId } = input;

  try {
    // 1. Fetch active device tokens from users other than the requester
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('device_tokens')
      .select('fcm_token, user_id')
      .eq('is_active', true)
      .neq('user_id', requesterId);

    if (tokensError) {
      logger.error({ err: tokensError }, 'Failed to fetch device tokens for broadcast');
      return;
    }

    if (!tokens || tokens.length === 0) {
      logger.info('No active device tokens found for broadcast');
      return;
    }

    // Filter by college if available
    let eligibleTokens = tokens;
    if (collegeId) {
      const { data: collegeProfiles } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('college_id', collegeId)
        .neq('id', requesterId);

      if (collegeProfiles && collegeProfiles.length > 0) {
        const allowedUserIds = new Set(collegeProfiles.map((p) => p.id));
        const filtered = tokens.filter((t) => allowedUserIds.has(t.user_id));
        if (filtered.length > 0) {
          eligibleTokens = filtered;
        }
      }
    }

    const title = `📦 New Delivery Request! Earn ₹${deliveryFee}`;
    const body = dropoffLocation
      ? `Someone requested ${itemName} to ${dropoffLocation}. Can you bring it and earn ₹${deliveryFee}?`
      : `Someone requested ${itemName}. Can you bring it and earn ₹${deliveryFee}?`;

    // 2. Insert notifications in Supabase for in-app notification list (batch insert using valid 'system' enum)
    const recipientUserIds = Array.from(new Set(eligibleTokens.map((t) => t.user_id)));
    if (recipientUserIds.length > 0) {
      const notificationsToInsert = recipientUserIds.map((userId) => ({
        user_id: userId,
        type: 'system' as const,
        title,
        body,
        related_request_id: requestId,
      }));

      const { error: insertError } = await supabaseClient
        .from('notifications')
        .insert(notificationsToInsert);

      if (insertError) {
        logger.warn({ err: insertError }, 'Failed to log broadcast notifications in DB (continuing with push)');
      }
    }

    // 3. Send FCM multicast push
    const fcmTokens = Array.from(new Set(eligibleTokens.map((t) => t.fcm_token as string)));
    if (fcmTokens.length === 0) return;

    const messaging = getMessagingClient();
    const response = await messaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body },
      data: {
        request_id: requestId,
        type: 'new_request',
        delivery_fee: String(deliveryFee),
      },
    });

    // 4. Prune dead tokens
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
      {
        requestId,
        recipientsCount: fcmTokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
      },
      'Broadcast push notifications sent for new request'
    );
  } catch (err) {
    logger.error({ err, requestId }, 'Unexpected failure in broadcastNewRequestNotification');
  }
}