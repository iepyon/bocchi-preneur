"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// メールでログインする（パスワードは使わない）。
// リンクを押す方法と、メールに書かれた6桁のコードを入れる方法の両方に対応する。
// 会社のメールの安全チェックがリンクを先に開いて使用済みにしてしまう場合は、コードで入れる。
export function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verifying" | "error" | "badcode">("idle");
  const [linkError, setLinkError] = useState(false);

  // リンクの期限切れ・使用済みのとき、URL にエラーが付いて戻ってくる
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error") || hash.get("error_code") || query.get("error_code")) {
      setLinkError(true);
    }
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "sending") return;
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // ログイン後、今いたページ（招待リンクなど）に戻る
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setState(error ? "error" : "sent");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim()) || state === "verifying") return;
    setState("verifying");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    // 成功するとログイン状態が変わり、画面が自動で切り替わる
    if (error) setState("badcode");
  }

  return (
    <>
      <h1>ログイン</h1>
      {linkError && (
        <div className="notice box error">
          ログインのリンクが使えませんでした（期限切れか、使用済み）。もう一度送るか、メールに書かれた6桁のコードを入れてください。
        </div>
      )}
      <p className="sub">メールアドレスを入れると、ログイン用のリンクと6桁のコードが届きます。パスワードは要りません。</p>
      <form onSubmit={send}>
        <label className="field">
          <span>メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <button type="submit" disabled={state === "sending" || !email.trim()}>
          {state === "sending" ? "送信中…" : "ログイン用のメールを送る"}
        </button>
      </form>

      {(state === "sent" || state === "verifying" || state === "badcode") && (
        <>
          <div className="notice">
            メールを送りました。リンクを押すか、メールに書かれた6桁のコードを下に入れてください。届かなければ迷惑メールも確認してください。
          </div>
          <form onSubmit={verify}>
            <label className="field">
              <span>6桁のコード</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button type="submit" disabled={code.length !== 6 || state === "verifying"}>
              {state === "verifying" ? "確認中…" : "コードでログイン"}
            </button>
          </form>
          {state === "badcode" && (
            <div className="notice box error">コードが違うか、期限が切れています。もう一度メールを送ってください。</div>
          )}
        </>
      )}
      {state === "error" && (
        <div className="notice box error">
          送れませんでした。短い時間に何度も送ると止まることがあります。少し時間をおいて、もう一度試してください。
        </div>
      )}
    </>
  );
}
