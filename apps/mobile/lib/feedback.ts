import { supabase } from './supabase';

/**
 * In-app feedback. Anyone signed in can send it; only the feedback admins
 * (the app's owner) can read it. Feedback is anonymous — the row stores no
 * user — and the server rate-limits each account (3 per 10 min, 10 per day).
 * See supabase/migrations/20261012165614_feedback.sql.
 */

export const FEEDBACK_HEADLINE_MAX = 80;
export const FEEDBACK_BODY_MAX = 2000;

/** What `submit_feedback` answers. Mirrors the SQL function. */
export type FeedbackResult =
  | 'ok'
  | 'invalid_headline'
  | 'invalid_body'
  | 'rate_limited';

const RESULTS: readonly FeedbackResult[] = [
  'ok',
  'invalid_headline',
  'invalid_body',
  'rate_limited',
];

export type FeedbackItem = {
  id: string;
  headline: string;
  body: string;
  createdAt: string;
  /** null = unread. Set when an admin opens the entry (or marks it read). */
  readAt: string | null;
};

export async function submitFeedback(
  headline: string,
  body: string,
): Promise<FeedbackResult> {
  const { data, error } = await supabase.rpc('submit_feedback', {
    p_headline: headline,
    p_body: body,
  });
  if (error) throw error;
  const result = RESULTS.find((r) => r === data);
  if (!result) throw new Error(`Unexpected submit_feedback result: ${data}`);
  return result;
}

/** The unread count if you're a feedback admin, null if you aren't. */
export async function fetchFeedbackUnreadCount(): Promise<number | null> {
  const { data, error } = await supabase.rpc('feedback_unread_count');
  if (error) throw error;
  return data;
}

/** All feedback, newest first. Admin only — the server refuses anyone else. */
export async function fetchFeedback(): Promise<FeedbackItem[]> {
  const { data, error } = await supabase.rpc('list_feedback');
  if (error) throw error;
  return data.map((f) => ({
    id: f.id,
    headline: f.headline,
    body: f.body,
    createdAt: f.created_at,
    readAt: f.read_at,
  }));
}

/** Mark entries read (or unread with `read = false`). Admin only. */
export async function setFeedbackRead(ids: string[], read: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_feedback_read', {
    p_ids: ids,
    p_read: read,
  });
  if (error) throw error;
}

/** Delete entries for good. Admin only. */
export async function deleteFeedback(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('delete_feedback', { p_ids: ids });
  if (error) throw error;
}
