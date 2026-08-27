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
  // after an upload (CDN / image caches can be aggressive).
  return `${data.publicUrl}?t=${Date.now()}`;
}
