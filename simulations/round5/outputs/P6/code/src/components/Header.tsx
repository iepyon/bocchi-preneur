"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { isWritingDay } from "@/lib/supabase";
import { SignOut } from "./SignOut";

export function Header() {
  const { memberships, roomId, setRoomId, staleWarning, isAdmin } = useSession();
  const path = usePathname();
  const me = memberships.find((m) => m.room_id === roomId);

  const nav = [
    { href: "/", label: "仲間の一覧" },
    { href: "/write", label: "進捗を書く" },
    { href: "/consult", label: "15分相談" },
    { href: "/survey", label: "アンケート" },
    ...(isAdmin ? [{ href: "/admin", label: "管理" }] : []),
  ];

  return (
    <header className="header">
      <div className="header-top">
        {memberships.length > 1 ? (
          <select
            value={roomId ?? ""}
            onChange={(e) => setRoomId(e.target.value)}
            aria-label="部屋を切り替える"
            className="room-select"
          >
            {memberships.map((m) => (
              <option key={m.room_id} value={m.room_id}>
                {m.room_name}
              </option>
            ))}
          </select>
        ) : (
          <strong>{me?.room_name ?? ""}</strong>
        )}
        <span className="viewer">
          {me ? `${me.display_name}${me.is_external ? "（社外）" : ""}` : ""} <SignOut />
        </span>
      </div>
      <nav className="nav">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>
            {n.label}
          </Link>
        ))}
      </nav>
      {isWritingDay() && <p className="notice">今日は書く日（月・水・金）です。1行だけでも書いてみましょう。</p>}
      {staleWarning && (
        <p className="notice">最新の状態を取り直せませんでした。表示が少し古いかもしれません。再読み込みしてください。</p>
      )}
    </header>
  );
}
