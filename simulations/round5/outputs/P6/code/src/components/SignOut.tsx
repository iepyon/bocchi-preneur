"use client";

import { supabase } from "@/lib/supabase";

export function SignOut() {
  return (
    <button
      type="button"
      className="secondary small"
      onClick={async () => {
        // この端末だけログアウト（他の端末はそのまま）
        await supabase.auth.signOut({ scope: "local" });
        try {
          window.localStorage.removeItem("current-room");
        } catch {
          /* noop */
        }
        window.location.href = "/";
      }}
    >
      ログアウト
    </button>
  );
}
