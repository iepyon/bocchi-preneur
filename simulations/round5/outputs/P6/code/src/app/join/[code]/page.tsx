"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

// 招待リンクから部屋に入る
export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { reloadMemberships, setRoomId } = useSession();
  const [name, setName] = useState("");
  const [external, setExternal] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "error" | "invalid" | "taken" | "other">("idle");

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || external === null || state === "sending") return;
    setState("sending");
    const { data, error } = await supabase.rpc("join_room", {
      code: params.code,
      name: name.trim(),
      external,
    });
    if (error) {
      const m = error.message;
      setState(
        m.includes("invalid invite code") || m.includes("removed from room")
          ? "invalid"
          : m.includes("already in another room")
            ? "other"
            : error.code === "23505"
              ? "taken"
              : "error",
      );
      return;
    }
    await reloadMemberships();
    if (typeof data === "string") setRoomId(data);
    router.push("/");
  }

  return (
    <>
      <h1>部屋に入る</h1>
      <p className="sub">
        新規事業の種づくりの進捗を、同じ立場の仲間と見せ合う部屋です。書いた内容は同じ部屋の人だけが読めます。社外の人もいるので、会社の機密に当たることは書かないでください。
      </p>
      <form onSubmit={join}>
        <label className="field">
          <span>部屋で表示する名前（ニックネーム可）</span>
          <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} required />
        </label>
        <fieldset className="field" style={{ border: "none", padding: 0 }}>
          <span>この部屋の作り手と同じ会社ですか？</span>
          <label>
            <input type="radio" name="ext" checked={external === false} onChange={() => setExternal(false)} /> 同じ会社
          </label>
          <label>
            <input type="radio" name="ext" checked={external === true} onChange={() => setExternal(true)} /> 別の会社
          </label>
        </fieldset>
        <button type="submit" disabled={!name.trim() || external === null || state === "sending"}>
          {state === "sending" ? "送信中…" : "部屋に入る"}
        </button>
      </form>
      {state === "invalid" && (
        <div className="notice box error">招待リンクが正しくありません。送ってくれた人に確認してください。</div>
      )}
      {state === "other" && (
        <div className="notice box error">
          すでに別の部屋に入っています。参加できる部屋は1人1つです。<a href="/">自分の部屋へ戻る</a>
        </div>
      )}
      {state === "taken" && (
        <div className="notice box error">その名前は、この部屋ですでに使われています。別の名前にしてください。</div>
      )}
      {state === "error" &&<div className="notice box error">入れませんでした。もう一度試してください。</div>}
    </>
  );
}
