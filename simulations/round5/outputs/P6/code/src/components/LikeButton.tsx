"use client";

import { useState } from "react";
import { supabase, type Reaction, type MemberStatus } from "@/lib/supabase";

type Props = {
  postId: string;
  roomId: string;
  postAuthorId: string;
  userId: string | null;
  reactions: Reaction[]; // この書き込みへのいいね（外したものも含む）
  members: MemberStatus[];
  onUpsert: (r: Reaction) => void; // 1件ずつ反映（他の人のいいねを上書きしない）
};

// いいね。押すと付き、もう一度押すと外れる（行は消さず active を切り替える）
export function LikeButton({ postId, roomId, postAuthorId, userId, reactions, members, onUpsert }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = reactions.filter((r) => r.active);
  const mineRow = reactions.find((r) => r.user_id === userId);
  const mine = mineRow?.active === true;
  const names = active
    .map((r) => members.find((m) => m.user_id === r.user_id)?.display_name)
    .filter(Boolean)
    .join("、");
  const isOwn = userId === postAuthorId;

  async function toggle() {
    if (!userId || busy || isOwn) return;
    setBusy(true);
    setFailed(false);
    const setActive = (active: boolean) =>
      supabase.from("reactions").update({ active }).match({ post_id: postId, user_id: userId }).select().single();
    let res = mineRow
      ? await setActive(!mineRow.active)
      : await supabase.from("reactions").insert({ post_id: postId, room_id: roomId }).select().single();
    // 画面の状態が古く、実はもう記録があった場合は「付ける」に切り替える
    if (!mineRow && res.error?.code === "23505") res = await setActive(true);
    if (res.error) setFailed(true);
    else onUpsert(res.data as Reaction);
    setBusy(false);
  }

  return (
    <div className="like">
      <button
        type="button"
        className={`secondary small ${mine ? "on" : ""}`}
        onClick={toggle}
        disabled={busy || !userId || isOwn}
        aria-pressed={mine}
        title={isOwn ? "自分の書き込みには押せません" : undefined}
      >
        {mine ? "♥ いいね済み" : "♡ いいね"} {active.length > 0 && active.length}
      </button>
      {names && <span className="sub">{names}</span>}
      {failed && <span className="sub">送れませんでした。もう一度押してください。</span>}
    </div>
  );
}
