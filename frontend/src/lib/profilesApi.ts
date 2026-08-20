import { supabase } from './supabase';

// Read DIRECTLY from Supabase, bypassing the backend's REST API — same
// pattern the backend's own docs use for Messages. The REST API only
// returns requester_id/deliverer_id as raw uuids, not a name to display.
//
// If this throws a permissions error, the `profiles` table's Row Level
// Security doesn't yet allow reading OTHER people's rows — ask your friend
// to add:
//   CREATE POLICY "Authenticated users can view profiles"
//   ON public.profiles FOR SELECT TO authenticated USING (true);

export type ProfileRow = {
  id: string;
  full_name: string;
  average_rating: number;
  total_ratings: number;
  profile_picture: string | null;
};

// One query for a whole list of ids, instead of one query per card.
export async function getProfilesByIds(ids: string[]): Promise<Record<string, ProfileRow>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, average_rating, total_ratings, profile_picture')
    .in('id', uniqueIds);

  if (error) throw error;

  const map: Record<string, ProfileRow> = {};
  (data ?? []).forEach((p) => (map[p.id] = p));
  return map;
}

export function initialsFromName(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}