import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { AuthGate } from "@/components/AuthGate";
import { supabaseConfigured } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "種の進捗",
  description: "新規事業の種づくりの進捗を仲間と共有する",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main className="container">
          {supabaseConfigured ? (
            <SessionProvider>
              <AuthGate>{children}</AuthGate>
            </SessionProvider>
          ) : (
            <div className="box error">
              接続先が設定されていません。.env.example をコピーして .env.local を作り、Supabase の URL と anon キーを入れてください。
            </div>
          )}
        </main>
      </body>
    </html>
  );
}
