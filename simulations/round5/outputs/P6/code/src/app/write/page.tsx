"use client";

import { useEffect, useState } from "react";
import { supabase, relativeLabel, type ProgressPost } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export default function WritePage() {
  const { memberships, roomId, userId, reloadMembers } = useSession();
  const [did, setDid] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [blocked, setBlocked] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [mine, setMine] = useState<ProgressPost[] | null>(null);
  const [mineError, setMineError] = useState(false);

  const me = memberships.find((m) => m.room_id === roomId);

  useEffect(() => {
    if (!roomId || !userId) return;
    let cancelled = false;
    setMine(null);
    setMineError(false);
    supabase
      .from("progress_posts")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setMineError(true);
        else setMine((data ?? []) as ProgressPost[]);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, userId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !did.trim() || sending) return;
    setSending(true);
    setMessage(null);
    // 誰が書いたかはサーバー側でログイン中の人から決まる（画面からは送らない）
    const { data, error } = await supabase
      .from("progress_posts")
      .insert({
        room_id: roomId,
        did: did.trim(),
        next_step: nextStep.trim() || null,
        blocked: blocked.trim() || null,
      })
      .select()
      .single();
    setSending(false);
    if (error) {
      setMessage({
        kind: "error",
        text: error.message.includes("too many posts")
          ? "短い時間に書き込みが続いたので止めました。1分ほど待ってから押してください。書いた内容は消えていません。"
          : "送れませんでした。書いた内容は消えていません。もう一度押してください。",
      });
      return;
    }
    setMine((prev) => [data as ProgressPost, ...(prev ?? [])]);
    setDid("");
    setNextStep("");
    setBlocked("");
    setMessage({ kind: "ok", text: "書き込みました。仲間の一覧にすぐ出ます。" });
    reloadMembers();
  }

  async function remove(id: string) {
    if (!window.confirm("この書き込みを消しますか？元に戻せません。")) return;
    const { error } = await supabase.from("progress_posts").delete().eq("id", id);
    if (error) {
      setMessage({ kind: "error", text: "消せませんでした。もう一度試してください。" });
      return;
    }
    setMine((prev) => (prev ?? []).filter((p) => p.id !== id));
    reloadMembers();
  }

  return (
    <>
      <h1>{me ? `${me.display_name}さんの進捗` : "進捗を書く"}</h1>
      <p className="sub">社外の人も読む部屋です。会社の機密に当たることは書かないでください。</p>
      <form onSubmit={submit}>
        <label className="field">
          <span>今週やったこと（1行でOK）</span>
          <input type="text" value={did} maxLength={500} onChange={(e) => setDid(e.target.value)} required />
        </label>
        <label className="field">
          <span>次にやること</span>
          <input type="text" value={nextStep} maxLength={500} onChange={(e) => setNextStep(e.target.value)} />
        </label>
        <label className="field">
          <span>止まっていること（任意）</span>
          <textarea value={blocked} maxLength={500} onChange={(e) => setBlocked(e.target.value)} rows={2} />
        </label>
        <button type="submit" disabled={!did.trim() || sending || !roomId}>
          {sending ? "送信中…" : "書き込む"}
        </button>
      </form>
      {message && <div className={`notice ${message.kind === "error" ? "box error" : ""}`}>{message.text}</div>}

      <h2>これまでの書き込み</h2>
      {mineError && <div className="box error">これまでの書き込みを読み込めませんでした。再読み込みしてください。</div>}
      {!mineError && mine === null && <p className="empty">読み込み中…</p>}
      {mine?.length === 0 && <p className="empty">まだ書き込みはありません。最初の一言は短くて大丈夫です。</p>}
      {mine?.map((p) => (
        <div key={p.id} className="box">
          <div className="row">
            <span>{p.did}</span>
            <span className="sub">{relativeLabel(p.created_at)}</span>
          </div>
          {p.next_step && <div className="sub">次：{p.next_step}</div>}
          {p.blocked && <div className="sub">止まっていること：{p.blocked}</div>}
          <button type="button" className="secondary small" onClick={() => remove(p.id)}>
            消す
          </button>
        </div>
      ))}
    </>
  );
}
