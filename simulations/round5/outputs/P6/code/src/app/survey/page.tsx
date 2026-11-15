"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

type Answer = "very" | "somewhat" | "not";
const OPTIONS: { value: Answer; label: string }[] = [
  { value: "very", label: "非常に残念" },
  { value: "somewhat", label: "少し残念" },
  { value: "not", label: "残念ではない" },
];

// 「なくなったら残念か」アンケート（検証の指標2）
export default function SurveyPage() {
  const { userId } = useSession();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"loading" | "idle" | "sending" | "done" | "error">("loading");

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("survey_responses")
      .select("answer, reason")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAnswer(data.answer as Answer);
          setReason(data.reason ?? "");
        }
        setState("idle");
      });
  }, [userId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer || state === "sending") return;
    setState("sending");
    const { error } = await supabase
      .from("survey_responses")
      .upsert({ answer, reason: reason.trim() || null }, { onConflict: "user_id" });
    setState(error ? "error" : "done");
  }

  if (state === "loading") return <p className="empty">読み込み中…</p>;

  return (
    <>
      <h1>アンケート（1問）</h1>
      <form onSubmit={submit}>
        <p>このサービスが明日から使えなくなったら、どう感じますか？</p>
        {OPTIONS.map((o) => (
          <label key={o.value} className="box" style={{ display: "block", cursor: "pointer" }}>
            <input
              type="radio"
              name="answer"
              value={o.value}
              checked={answer === o.value}
              onChange={() => setAnswer(o.value)}
            />{" "}
            {o.label}
          </label>
        ))}
        <label className="field">
          <span>そう感じる理由（任意）</span>
          <textarea value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} rows={3} />
        </label>
        <button type="submit" disabled={!answer || state === "sending"}>
          {state === "sending" ? "送信中…" : "回答する"}
        </button>
      </form>
      {state === "done" && <div className="notice">回答しました。ありがとうございます。あとから書き直せます。</div>}
      {state === "error" && <div className="notice box error">送れませんでした。もう一度押してください。</div>}
    </>
  );
}
