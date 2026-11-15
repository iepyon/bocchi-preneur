"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  STALE_DAYS,
  daysSince,
  relativeLabel,
  type MemberStatus,
  type ProgressPost,
  type Reaction,
} from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { LikeButton } from "@/components/LikeButton";

function upsertReaction(prev: Reaction[], r: Reaction): Reaction[] {
  const i = prev.findIndex((x) => x.post_id === r.post_id && x.user_id === r.user_id);
  if (i === -1) return [...prev, r];
  // 古い通知で新しい状態を上書きしない
  if (new Date(prev[i].updated_at) > new Date(r.updated_at)) return prev;
  const next = prev.slice();
  next[i] = r;
  return next;
}

export default function Home() {
  const { members, roomId, userId, reloadMembers, loading } = useSession();
  const [posts, setPosts] = useState<ProgressPost[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [live, setLive] = useState<"connecting" | "on" | "off">("connecting");
  const [feedError, setFeedError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // 新しい書き込みといいねをリアルタイムで受け取る。
  // 購読がつながるたび（初回・スリープや通信断からの復帰）に一覧を取り直し、取りこぼしを防ぐ。
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setPosts([]);
    setReactions([]);
    setLive("connecting");

    async function fetchFeed() {
      const { data, error } = await supabase
        .from("progress_posts")
        .select("*")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (error || !data) {
        setFeedError(true);
        return;
      }
      const ids = data.map((p) => p.id);
      const { data: rs, error: rErr } = ids.length
        ? await supabase.from("reactions").select("*").in("post_id", ids)
        : { data: [], error: null };
      if (cancelled) return;
      if (rErr) {
        setFeedError(true);
        return;
      }
      setFeedError(false);
      setPosts(data as ProgressPost[]);
      setReactions((rs ?? []) as Reaction[]);
      setNow(Date.now());
    }

    const filter = `room_id=eq.${roomId}`;
    const channel = supabase
      .channel(`room-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "progress_posts", filter }, (payload) => {
        const p = payload.new as ProgressPost;
        setPosts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev].slice(0, 30)));
        setNow(Date.now());
        reloadMembers();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reactions", filter }, (payload) => {
        setReactions((prev) => upsertReaction(prev, payload.new as Reaction));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reactions", filter }, (payload) => {
        setReactions((prev) => upsertReaction(prev, payload.new as Reaction));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive("on");
          fetchFeed();
          reloadMembers();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLive("off");
        }
      });

    // 消された書き込みは通知で届かないので、画面に戻ってきたときと2分ごとに取り直す
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchFeed();
        reloadMembers();
      }
    };
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 120_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [roomId, reloadMembers]);

  // 止まっている人（7日以上更新なし・一度も書いていない）を上に
  const sorted = useMemo(() => {
    const score = (m: MemberStatus) => {
      const d = daysSince(m.last_posted_at, now);
      return d === null ? Number.MAX_SAFE_INTEGER : d;
    };
    return [...members].sort((a, b) => score(b) - score(a));
  }, [members, now]);

  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? "（退出した人）";

  if (loading) return <p className="empty">読み込み中…</p>;

  return (
    <>
      <h1>仲間の様子</h1>
      {sorted.length === 0 && <p className="empty">まだ誰も部屋にいません。</p>}
      {sorted.map((m) => {
        const d = daysSince(m.last_posted_at, now);
        const stale = d === null || d >= STALE_DAYS;
        return (
          <div key={m.user_id} className={`box ${stale ? "stale" : ""}`}>
            <div className="row">
              <strong>
                {m.display_name}
                {m.is_external && <span className="sub">（社外）</span>}
                {m.user_id === userId && <span className="sub">（あなた）</span>}
              </strong>
              <span className="tag">
                {d === null ? "まだ書いていない" : stale ? `${d}日 更新なし` : relativeLabel(m.last_posted_at!, now)}
              </span>
            </div>
            <div className="sub">{m.last_did ? `最後：「${m.last_did}」` : "最初の一言を待っています"}</div>
          </div>
        );
      })}

      <h2>
        新しい書き込み{" "}
        <span className="live">
          {live === "on"
            ? "● 自動で更新中"
            : live === "off"
              ? "○ 自動更新が切れています（再読み込みしてください）"
              : "接続中…"}
        </span>
      </h2>
      {feedError && <div className="box error">書き込みを読み込めませんでした。再読み込みしてください。</div>}
      {!feedError && live !== "connecting" && posts.length === 0 && (
        <p className="empty">まだ誰も書いていません。最初の一言を書いてみましょう。</p>
      )}
      {posts.map((p) => (
        <div key={p.id} className="box">
          <div className="row">
            <strong>{nameOf(p.user_id)}</strong>
            <span className="sub">{relativeLabel(p.created_at, now)}</span>
          </div>
          <div>やったこと：{p.did}</div>
          {p.next_step && <div className="sub">次：{p.next_step}</div>}
          {p.blocked && <div className="sub">止まっていること：{p.blocked}</div>}
          <LikeButton
            postId={p.id}
            roomId={p.room_id}
            postAuthorId={p.user_id}
            userId={userId}
            members={members}
            reactions={reactions.filter((r) => r.post_id === p.id)}
            onUpsert={(r) => setReactions((prev) => upsertReaction(prev, r))}
          />
        </div>
      ))}
    </>
  );
}
