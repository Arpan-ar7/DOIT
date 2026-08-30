import { supabase } from './supabase';

const BUCKET = 'ProfilePic';

/**
 * Upload a local image to Supabase Storage and return the public URL.
 *
 * The file is stored as `{userId}.jpg`, so each user gets exactly one
 * profile picture that is overwritten on every update.
 */
export async function uploadProfilePicture(
  userId: string,
  localUri: string,
): Promise<string> {
  // React Native's fetch can read local file:// URIs and return a blob.
  const response = await fetch(localUri);
  const blob = await response.blob();

  const filePath = `${userId}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true, // overwrite previous avatar
    });

  if (error) {
    throw new Error(`Profile picture upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  // Append a cache-buster so the app always fetches the latest image
  // after an update (CDN / image caches can be aggressive).
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Upload a chat attachment photo to Supabase Storage (ProfilePic bucket) and return the public URL.
 */
export async function uploadChatImage(
  requestId: string,
  localUri: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = fileExt.includes('?') ? fileExt.split('?')[0] : fileExt;
  const fileName = `chat/${requestId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, blob, {
      contentType: `image/${cleanExt === 'png' ? 'png' : 'jpeg'}`,
      upsert: true,
    });

  if (error) {
    throw new Error(`Chat image upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

