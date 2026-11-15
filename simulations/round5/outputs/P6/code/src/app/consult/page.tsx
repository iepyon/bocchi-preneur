"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

// 15分相談のモック。実際の予約はせず、押された記録だけ残す（検証の指標3）
const SLOTS = ["平日 12:00〜12:15", "平日 18:00〜18:15", "平日 21:00〜21:15"];

export default function ConsultPage() {
  const { roomId } = useSession();
  const [slot, setSlot] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function book() {
    if (!slot || !roomId || state === "sending") return;
    setState("sending");
    const { error } = await supabase.from("booking_clicks").insert({ room_id: roomId, slot_label: slot });
    // 同じ枠をもう一度押した場合（1人1枠1件）も、記録済みとして扱う
    setState(error && error.code !== "23505" ? "error" : "done");
  }

  return (
    <>
      <h1>15分相談</h1>
      <div className="box">新規事業に詳しい人に、15分だけ相談できます（準備中）。</div>

      <h2>希望する時間帯</h2>
      {SLOTS.map((s) => (
        <label key={s} className="box" style={{ display: "block", cursor: "pointer" }}>
          <input
            type="radio"
            name="slot"
            value={s}
            checked={slot === s}
            onChange={() => {
              setSlot(s);
              if (state !== "sending") setState("idle");
            }}
          />{" "}
          {s}
        </label>
      ))}

      <button onClick={book} disabled={!slot || state === "sending"}>
        {state === "sending" ? "送信中…" : "予約する"}
      </button>

      {state === "done" && (
        <div className="notice">
          ありがとうございます。この機能はまだ準備中で、予約は確定していません。関心があったことを記録しました。
        </div>
      )}
      {state === "error" && <div className="notice box error">記録できませんでした。もう一度押してください。</div>}
    </>
  );
}
