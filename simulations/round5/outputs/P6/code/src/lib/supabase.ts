import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type MemberStatus = {
  room_id: string;
  user_id: string;
  display_name: string;
  is_external: boolean;
  last_posted_at: string | null;
  last_did: string | null;
};

export type ProgressPost = {
  id: string;
  room_id: string;
  user_id: string;
  did: string;
  next_step: string | null;
  blocked: string | null;
  created_at: string;
};

export type Reaction = {
  post_id: string;
  user_id: string;
  room_id: string;
  active: boolean;
  updated_at: string;
};

export type Membership = {
  room_id: string;
  display_name: string;
  is_external: boolean;
  room_name: string;
};

export const STALE_DAYS = 7;

// 書く日（月・水・金）。密度を作るため、書く日を寄せる
export const WRITING_DAYS = [1, 3, 5];
export function isWritingDay(d = new Date()): boolean {
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return WRITING_DAYS.includes(jst.getDay());
}

export function daysSince(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

export function relativeLabel(iso: string, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "たった今";
  if (sec < 3600) return `${Math.floor(sec / 60)}分前`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}時間前`;
  return `${Math.floor(sec / 86_400)}日前`;
}
