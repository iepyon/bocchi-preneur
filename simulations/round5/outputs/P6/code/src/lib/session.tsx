"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type MemberStatus, type Membership } from "./supabase";

// ログイン状態・参加している部屋・今見ている部屋のメンバーをまとめて持つ
type SessionState = {
  session: Session | null;
  authReady: boolean;
  userId: string | null;
  isAdmin: boolean;
  memberships: Membership[];
  roomId: string | null;
  setRoomId: (id: string) => void;
  members: MemberStatus[];
  reloadMembers: () => Promise<void>;
  reloadMemberships: () => Promise<void>;
  loading: boolean;
  error: string | null;
  staleWarning: boolean;
};

const Ctx = createContext<SessionState | null>(null);
const ROOM_KEY = "current-room";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [roomId, setRoomIdState] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);
  const membersLoadedOnce = useRef(false);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setRoomId = useCallback((id: string) => {
    setRoomIdState(id);
    try {
      window.localStorage.setItem(ROOM_KEY, id);
    } catch {
      /* 保存できない環境でも動かす */
    }
  }, []);

  const reloadMemberships = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    const [{ data, error: mErr }, { data: admin }] = await Promise.all([
      supabase
        .from("room_members")
        .select("room_id, display_name, is_external, rooms(name)")
        .eq("user_id", userId)
        .order("joined_at"),
      supabase.rpc("is_admin"),
    ]);
    setIsAdmin(admin === true);
    if (mErr) {
      setError("参加している部屋を読み込めませんでした。再読み込みしてください。");
      setLoading(false);
      return;
    }
    const list: Membership[] = (data ?? []).map((r) => {
      const room = r.rooms as unknown as { name: string } | { name: string }[] | null;
      const name = Array.isArray(room) ? room[0]?.name : room?.name;
      return {
        room_id: r.room_id,
        display_name: r.display_name,
        is_external: r.is_external,
        room_name: name ?? "（名前なし）",
      };
    });
    setMemberships(list);
    setError(null);
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(ROOM_KEY);
    } catch {
      /* noop */
    }
    const next = list.find((m) => m.room_id === saved)?.room_id ?? list[0]?.room_id ?? null;
    if (next) setRoomId(next);
    else setRoomIdState(null);
    if (!list.length) setLoading(false);
  }, [userId, setRoomId]);

  useEffect(() => {
    if (authReady) reloadMemberships();
  }, [authReady, reloadMemberships]);

  // 最初の読み込みに失敗したら画面全体にエラー。表示できた後の取り直しの失敗は小さく知らせるだけ
  const reloadMembers = useCallback(async () => {
    if (!roomId) return;
    const { data, error: e } = await supabase.from("member_status").select("*").eq("room_id", roomId);
    if (e) {
      if (membersLoadedOnce.current) setStaleWarning(true);
      else setError("メンバーを読み込めませんでした。少し待ってから再読み込みしてください。");
      setLoading(false);
      return;
    }
    setMembers((data ?? []) as MemberStatus[]);
    setStaleWarning(false);
    membersLoadedOnce.current = true;
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    membersLoadedOnce.current = false;
    setMembers([]);
    reloadMembers();
  }, [reloadMembers]);

  return (
    <Ctx.Provider
      value={{
        session,
        authReady,
        userId,
        isAdmin,
        memberships,
        roomId,
        setRoomId,
        members,
        reloadMembers,
        reloadMemberships,
        loading,
        error,
        staleWarning,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
