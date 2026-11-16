"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

type Room = { id: string; name: string; invite_code: string; members: number };
type DayRow = { room_name: string; room_ref: string; member_id: string; display_name: string; is_external: boolean; week: number; days_written: number };
type Density = { room_name: string; day: string; writers: number; members: number };
type Summary = { metric: string; value: number };

const PASS_DAYS = 3; // 毎週3日以上
const PASS_PEOPLE = 5; // 5人以上で合格（＝撤退の線）

// 作り手（管理者）用。参加者の書き込みの中身は見ず、数だけを見る
export default function AdminPage() {
  const { isAdmin, authReady } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [density, setDensity] = useState<Density[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState<{ start_date: string; weeks: number } | null>(null);
  const [newRoom, setNewRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [r, d, den, s, p] = await Promise.all([
      supabase.rpc("admin_rooms"),
      supabase.rpc("admin_writing_days"),
      supabase.rpc("admin_daily_density"),
      supabase.rpc("admin_summary"),
      supabase.from("test_period").select("start_date, weeks").maybeSingle(),
    ]);
    const firstErr = r.error ?? d.error ?? den.error ?? s.error ?? p.error;
    setError(
      firstErr
        ? firstErr.message.includes("test period not set")
          ? "検証期間がまだ設定されていません。いちばん下の「検証期間」で開始日を保存してください。"
          : "集計を読み込めませんでした。再読み込みしてください。"
        : null,
    );
    setRooms((r.data ?? []) as Room[]);
    setDays((d.data ?? []) as DayRow[]);
    setDensity((den.data ?? []) as Density[]);
    setSummary(Object.fromEntries(((s.data ?? []) as Summary[]).map((x) => [x.metric, x.value])));
    setPeriod(p.data ?? null);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // 参加者ごとに週別の日数をまとめ、合格者を数える
  const people = useMemo(() => {
    type Person = {
      key: string;
      roomRef: string;
      memberId: string;
      room: string;
      name: string;
      external: boolean;
      weeks: number[];
    };
    const map = new Map<string, Person>();
    for (const row of days) {
      const key = `${row.room_ref}\u0000${row.member_id}`;
      const e: Person = map.get(key) ?? {
        key,
        roomRef: row.room_ref,
        memberId: row.member_id,
        room: row.room_name,
        name: row.display_name,
        external: row.is_external,
        weeks: [],
      };
      e.weeks[row.week - 1] = row.days_written;
      map.set(key, e);
    }
    return [...map.values()];
  }, [days]);
  const weeks = period?.weeks ?? 2;
  const passed = people.filter((p) => Array.from({ length: weeks }, (_, i) => p.weeks[i] ?? 0).every((n) => n >= PASS_DAYS));

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoom.trim() || creating) return;
    setCreating(true);
    const { error: err } = await supabase.from("rooms").insert({ name: newRoom.trim() });
    setCreating(false);
    if (err) setError(err.code === "23505" ? "同じ名前の部屋がすでにあります。" : "部屋を作れませんでした。");
    else {
      setNewRoom("");
      load();
    }
  }

  async function savePeriod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const values = { start_date: String(f.get("start")), weeks: Number(f.get("weeks")) };
    const upd = await supabase.from("test_period").update(values).eq("id", 1).select();
    const err = upd.error ?? (upd.data?.length ? null : (await supabase.from("test_period").insert({ id: 1, ...values })).error);
    if (err) setError("検証期間を保存できませんでした。");
    else load();
  }

  async function removeMember(roomRef: string, memberId: string, name: string) {
    if (
      !window.confirm(
        `${name}さんを部屋から外しますか？その人の書き込みも消え、元に戻せません。同じ招待リンクでは戻れなくなります。`,
      )
    )
      return;
    const { error: err } = await supabase.rpc("admin_remove_member", { target_room: roomRef, target_user: memberId });
    if (err) setError("外せませんでした。");
    else load();
  }

  async function rotateInvite(roomRef: string) {
    if (!window.confirm("招待リンクを作り直しますか？古いリンクは使えなくなります（参加済みの人はそのまま）。")) return;
    const { error: err } = await supabase.rpc("admin_rotate_invite", { target_room: roomRef });
    if (err) setError("招待リンクを作り直せませんでした。");
    else load();
  }

  function inviteUrl(code: string) {
    return `${window.location.origin}/join/${code}`;
  }

  if (!authReady) return <p className="empty">読み込み中…</p>;
  if (!isAdmin) return <div className="box">このページは作り手だけが見られます。</div>;

  const total = summary.participants ?? 0;
  const very = summary.survey_very ?? 0;
  const answered = very + (summary.survey_somewhat ?? 0) + (summary.survey_not ?? 0);

  return (
    <>
      <h1>管理（作り手用）</h1>
      {error && <div className="box error">{error}</div>}

      <h2>判定（事前に決めた基準）</h2>
      <div className="box">
        <div>
          合格者（{weeks}週とも週{PASS_DAYS}日以上書いた人）：<strong>{passed.length}</strong> 人 ／ 参加 {total} 人
        </div>
        <div className="sub">
          基準：「20人に2週間使ってもらい、そのうち5人が、毎週3日以上書いたら進む価値がある」。
          {passed.length >= PASS_PEOPLE ? "いまの時点で線（5人）に届いています。" : `線（${PASS_PEOPLE}人）まであと ${PASS_PEOPLE - passed.length} 人。`}
          判断は期間が終わってから、本人が行います。
        </div>
      </div>
      <div className="box">
        なくなったら「非常に残念」：<strong>{very}</strong> 人 ／ 回答 {answered} 人
        {answered > 0 && `（${Math.round((very / answered) * 100)}%）`}
        <div className="sub">目安は40%以上。20人規模では参考程度。</div>
      </div>
      <div className="box">
        15分相談の予約ボタン：<strong>{summary.booking_people ?? 0}</strong> 人（{summary.booking_clicks ?? 0} 回）
      </div>

      <h2>参加者ごとの書いた日数</h2>
      {people.length === 0 ? (
        <p className="empty">まだ参加者がいません。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>部屋</th>
              <th>名前</th>
              {Array.from({ length: weeks }, (_, i) => (
                <th key={i}>{i + 1}週目</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.key}>
                <td>{p.room}</td>
                <td>
                  {p.name}
                  {p.external ? "（社外）" : ""}
                </td>
                {Array.from({ length: weeks }, (_, i) => (
                  <td key={i}>{p.weeks[i] ?? 0}日</td>
                ))}
                <td>
                  <button type="button" className="secondary small" onClick={() => removeMember(p.roomRef, p.memberId, p.name)}>
                    外す
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>密度（部屋ごと・日ごとに書いた人数）</h2>
      {density.length === 0 ? (
        <p className="empty">検証期間が始まると表示されます。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>部屋</th>
              <th>日付</th>
              <th>書いた人／参加者</th>
            </tr>
          </thead>
          <tbody>
            {density.map((d) => (
              <tr key={`${d.room_name}-${d.day}`}>
                <td>{d.room_name}</td>
                <td>{d.day}</td>
                <td>
                  {d.writers}／{d.members}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>部屋と招待リンク</h2>
      {rooms.map((r) => (
        <div key={r.id} className="box">
          <div className="row">
            <strong>{r.name}</strong>
            <span className="tag">{r.members}人</span>
          </div>
          <div className="like">
            <code className="sub" style={{ wordBreak: "break-all" }}>
              {inviteUrl(r.invite_code)}
            </code>
            <button
              type="button"
              className="secondary small"
              onClick={() => {
                navigator.clipboard?.writeText(inviteUrl(r.invite_code)).then(() => setCopied(r.id));
              }}
            >
              {copied === r.id ? "コピーしました" : "コピー"}
            </button>
            <button type="button" className="secondary small" onClick={() => rotateInvite(r.id)}>
              作り直す
            </button>
          </div>
        </div>
      ))}
      <form onSubmit={createRoom} className="like">
        <input
          type="text"
          value={newRoom}
          maxLength={60}
          onChange={(e) => setNewRoom(e.target.value)}
          placeholder="新しい部屋の名前"
        />
        <button type="submit" disabled={!newRoom.trim() || creating}>
          部屋を作る
        </button>
      </form>

      <h2>検証期間</h2>
      <form onSubmit={savePeriod} className="like" key={period?.start_date ?? "none"}>
        <label>
          開始日 <input type="date" name="start" defaultValue={period?.start_date ?? "2026-12-08"} required />
        </label>
        <label>
          週数 <input type="number" name="weeks" min={1} max={8} defaultValue={period?.weeks ?? 2} required />
        </label>
        <button type="submit" className="secondary">
          保存
        </button>
      </form>
    </>
  );
}
