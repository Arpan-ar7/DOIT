import { z } from 'zod';

export const submitRatingSchema = z.object({
  request_id: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});
export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;

export interface RatingRecord {
  id: string;
  request_id: string;
  rater_id: string;
  ratee_id: string;
  score: number;
  review: string | null;
  created_at: string;
}