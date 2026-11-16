"use client";

import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { Login } from "./Login";
import { Header } from "./Header";
import { SignOut } from "./SignOut";

// ログインしていなければログイン画面。部屋に入っていなければ案内を出す
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authReady, session, memberships, loading, error, isAdmin } = useSession();
  const path = usePathname();
  const isJoin = path.startsWith("/join/");
  const isAdminPage = path.startsWith("/admin");

  if (!authReady) return <p className="empty">読み込み中…</p>;
  if (!session) return <Login />;
  if (isJoin) return <>{children}</>;
  if (error) return <div className="box error">{error}</div>;
  if (loading && !memberships.length && !isAdminPage) return <p className="empty">読み込み中…</p>;

  if (!memberships.length && !(isAdmin && isAdminPage)) {
    return (
      <>
        <h1>まだ部屋に入っていません</h1>
        <p>招待リンクを受け取っていれば、そのリンクを開いてください。</p>
        {isAdmin && (
          <p>
            <a href="/admin">管理画面で部屋を作る</a>
          </p>
        )}
        <SignOut />
      </>
    );
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}
