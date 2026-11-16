-- ステップ5 価値検証版
-- 試作品（ログインなし・誰でも読み書き）の作りを捨て、
-- ログイン（Supabase Auth）＋「部屋の参加者だけが読み書きできる」作りにする。
-- 試作品のデータはダミーなので、テーブルごと作り直す。

drop view if exists member_status;
drop table if exists reactions cascade;
drop table if exists booking_clicks cascade;
drop table if exists progress_posts cascade;
drop table if exists members cascade;
drop table if exists rooms cascade;

-- ───────── テーブル ─────────

-- 作り手（管理者）。ここに入っている人だけが部屋を作り、集計を見られる。
-- 自分のユーザーIDを手で入れる：insert into admins (user_id) values ('...');
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- 検証期間（集計の起点）。1行だけ使う。
create table test_period (
  id int primary key default 1 check (id = 1),
  start_date date not null,
  weeks int not null default 2 check (weeks between 1 and 8)
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  -- 招待コード。推測されにくい長さにする
  invite_code text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  -- 動作確認用の部屋。集計（合格判定）から外す
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index rooms_name_unique on rooms (lower(name));

-- 管理者が外した人。同じ招待リンクで戻れないようにする
create table removed_members (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  removed_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table room_members (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_external boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user on room_members (user_id);

create table progress_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  user_id uuid not null default auth.uid(),
  did text not null check (char_length(did) between 1 and 500),
  next_step text check (char_length(next_step) <= 500),
  blocked text check (char_length(blocked) <= 500),
  created_at timestamptz not null default now(),
  -- 部屋を抜けたら、その人の書き込みも消える
  foreign key (room_id, user_id) references room_members(room_id, user_id) on delete cascade
);
create index progress_posts_room_created on progress_posts (room_id, created_at desc);

-- 「書いた日」の記録（中身は持たない）。書き込みを消しても残る（本人の判断：「3-a 数える」）。
-- 合格判定はこの表から数える。部屋を抜けた・外された人の記録は消える。
create table writing_days (
  room_id uuid not null,
  user_id uuid not null,
  day date not null,
  primary key (room_id, user_id, day),
  foreign key (room_id, user_id) references room_members(room_id, user_id) on delete cascade
);
create index progress_posts_user_created on progress_posts (user_id, created_at desc);

-- いいね。消さずに active を切り替える（削除の通知は読み取りルールで絞られず、
-- 他の部屋の人にも届いてしまうため。更新の通知は読み取りルールで絞られる）
create table reactions (
  post_id uuid not null references progress_posts(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  room_id uuid not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id),
  foreign key (room_id, user_id) references room_members(room_id, user_id) on delete cascade
);
create index reactions_room on reactions (room_id);

-- 15分相談の予約ボタンが押された記録（実際の予約はしない）
create table booking_clicks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  user_id uuid not null default auth.uid(),
  slot_label text not null check (char_length(slot_label) <= 100),
  clicked_at timestamptz not null default now(),
  foreign key (room_id, user_id) references room_members(room_id, user_id) on delete cascade
);

-- 「なくなったら残念か」アンケート（1人1回答、書き直し可）
create table survey_responses (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  answer text not null check (answer in ('very', 'somewhat', 'not')),
  reason text check (char_length(reason) <= 1000),
  updated_at timestamptz not null default now()
);

-- ───────── 判定用の関数（読み取りルールの中で使う） ─────────

create or replace function is_room_member(target_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from room_members where room_id = target_room and user_id = auth.uid()
  );
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- 自分の書き込みにはいいねできない／書き込みと同じ部屋でしか押せない
create or replace function check_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_room uuid;
  post_author uuid;
begin
  select room_id, user_id into post_room, post_author from progress_posts where id = new.post_id;
  if post_room is null or post_room <> new.room_id then
    raise exception 'reaction room mismatch';
  end if;
  if post_author = new.user_id then
    raise exception 'cannot react to own post';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger reactions_check before insert or update on reactions
  for each row execute function check_reaction();

-- 書き込み：時刻はサーバーが決める（判定の数字を偽れないように）＋回数制限（1人1分あたり5件まで）
create or replace function limit_post_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  -- 同時送信で制限をすり抜けられないよう、利用者ごとに順番に処理する
  perform pg_advisory_xact_lock(hashtext('post:' || new.user_id::text));
  if (select count(*) from progress_posts
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'too many posts';
  end if;
  return new;
end;
$$;
create trigger progress_posts_rate before insert on progress_posts
  for each row execute function limit_post_rate();

-- 書き込みが入ったら「書いた日」（日本時間）を記録する
create or replace function record_writing_day()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into writing_days (room_id, user_id, day)
  values (new.room_id, new.user_id, (new.created_at at time zone 'Asia/Tokyo')::date)
  on conflict do nothing;
  return new;
end;
$$;
create trigger progress_posts_day after insert on progress_posts
  for each row execute function record_writing_day();

-- いいね：付け外しの回数制限（1人1分あたり30回まで）
create or replace function limit_reaction_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('reaction:' || new.user_id::text));
  if (select count(*) from reactions
      where user_id = new.user_id and updated_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many reactions';
  end if;
  return new;
end;
$$;
create trigger reactions_rate before insert or update on reactions
  for each row execute function limit_reaction_rate();

-- 予約ボタン・アンケート：時刻はサーバーが決める
create or replace function set_server_time()
returns trigger language plpgsql as $$
begin
  if tg_table_name = 'booking_clicks' then
    new.clicked_at := now();
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger booking_clicks_time before insert on booking_clicks
  for each row execute function set_server_time();
create trigger survey_responses_time before insert or update on survey_responses
  for each row execute function set_server_time();

-- 予約ボタンは1人1枠1件（押した回数の水増しを防ぐ）
create unique index booking_clicks_once on booking_clicks (user_id, slot_label);

-- 同じ部屋で同じ表示名は使えない（見た目のなりすまし防止）
create unique index room_members_name_unique on room_members (room_id, lower(display_name));

-- ───────── アクセスのきまり（RLS） ─────────

alter table admins enable row level security;
alter table test_period enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table progress_posts enable row level security;
alter table reactions enable row level security;
alter table booking_clicks enable row level security;
alter table survey_responses enable row level security;
alter table removed_members enable row level security; -- ポリシーなし＝関数経由でしか触れない
alter table writing_days enable row level security;    -- 同上（集計関数とトリガーだけが触る）

-- ログインしていない人（anon）には何も許さない。以下はすべて authenticated のみ。
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
-- 今後追加する表にも、anon の権限が自動で付かないようにする
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;

-- admins：自分が管理者かどうかだけ分かればよい（関数 is_admin を使う）。直接は読ませない。

-- test_period：ログインした人は読める（「今日は何日目か」の表示用）。変更は管理者だけ
create policy "read period" on test_period for select to authenticated using (true);
create policy "admin writes period" on test_period for all to authenticated
  using (is_admin()) with check (is_admin());

-- rooms：参加している部屋だけ読める。作るのは管理者だけ
create policy "members read room" on rooms for select to authenticated
  using (is_room_member(id) or is_admin());
create policy "admin creates room" on rooms for insert to authenticated with check (is_admin());

-- room_members：同じ部屋の人だけ見える。自分の表示名は直せる。自分で抜けられる。
-- 参加は招待コード経由の関数 join_room だけ（直接の insert は不可）
create policy "members read members" on room_members for select to authenticated
  using (is_room_member(room_id));
create policy "update own membership" on room_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave room" on room_members for delete to authenticated
  using (user_id = auth.uid());

-- progress_posts：同じ部屋の人だけ読める。書くのは自分の名前でだけ。消せるのは自分の分だけ
create policy "members read posts" on progress_posts for select to authenticated
  using (is_room_member(room_id));
create policy "write own post" on progress_posts for insert to authenticated
  with check (user_id = auth.uid() and is_room_member(room_id));
create policy "delete own post" on progress_posts for delete to authenticated
  using (user_id = auth.uid());

-- reactions：同じ部屋の人だけ読める。押す・外すのは自分の分だけ
create policy "members read reactions" on reactions for select to authenticated
  using (is_room_member(room_id));
create policy "react as self" on reactions for insert to authenticated
  with check (user_id = auth.uid() and is_room_member(room_id));
create policy "toggle own reaction" on reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_room_member(room_id));

-- booking_clicks：記録するのは自分の分だけ。読めるのは自分の分だけ（集計は管理者用の関数で）
create policy "click as self" on booking_clicks for insert to authenticated
  with check (user_id = auth.uid() and is_room_member(room_id));
create policy "read own clicks" on booking_clicks for select to authenticated
  using (user_id = auth.uid());

-- survey_responses：自分の回答だけ読める・書ける
create policy "read own survey" on survey_responses for select to authenticated
  using (user_id = auth.uid());
-- 回答できるのは、どこかの部屋の参加者だけ
create policy "answer survey" on survey_responses for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from room_members where user_id = auth.uid()));
create policy "update own survey" on survey_responses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 列ごとの権限：自分で決めてはいけない列（ID・時刻・誰か・社外かどうか）を守る
revoke insert, update on room_members from authenticated;
grant update (display_name) on room_members to authenticated;
revoke insert, update on progress_posts from authenticated;
grant insert (room_id, did, next_step, blocked) on progress_posts to authenticated;
revoke insert, update on reactions from authenticated;
grant insert (post_id, room_id) on reactions to authenticated;
grant update (active) on reactions to authenticated;
revoke insert, update on booking_clicks from authenticated;
grant insert (room_id, slot_label) on booking_clicks to authenticated;
revoke insert, update on survey_responses from authenticated;
grant insert (answer, reason) on survey_responses to authenticated;
grant update (answer, reason) on survey_responses to authenticated;
revoke insert, update, delete on rooms from authenticated;
grant insert (name) on rooms to authenticated;
revoke insert, update, delete on test_period from authenticated;
grant insert (id, start_date, weeks), update (start_date, weeks) on test_period to authenticated;
revoke all on admins from authenticated;

-- 各メンバーの最終更新日時（見る人の権限で読み取りルールが効く）
create view member_status with (security_invoker = true) as
select m.room_id, m.user_id, m.display_name, m.is_external, m.joined_at,
       p.created_at as last_posted_at,
       p.did as last_did
from room_members m
left join lateral (
  select created_at, did from progress_posts pp
  where pp.room_id = m.room_id and pp.user_id = m.user_id
  order by created_at desc limit 1
) p on true;
revoke all on member_status from anon;
grant select on member_status to authenticated;

-- ───────── 招待コードで部屋に入る ─────────

create or replace function join_room(code text, name text, external boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if char_length(coalesce(trim(name), '')) not between 1 and 40 then
    raise exception 'invalid name';
  end if;
  select id into target from rooms where invite_code = code;
  if target is null then
    raise exception 'invalid invite code';
  end if;
  if exists (select 1 from removed_members where room_id = target and user_id = auth.uid()) then
    raise exception 'removed from room';
  end if;
  -- 1人1部屋（2部屋に入ると合格判定の数字が狂うため）
  if exists (select 1 from room_members where user_id = auth.uid() and room_id <> target) then
    raise exception 'already in another room';
  end if;
  insert into room_members (room_id, user_id, display_name, is_external)
  values (target, auth.uid(), trim(name), external)
  on conflict (room_id, user_id) do nothing;
  return target;
end;
$$;
revoke all on function join_room(text, text, boolean) from public, anon;
grant execute on function join_room(text, text, boolean) to authenticated;

-- ───────── 作り手（管理者）用の集計。中身ではなく数だけを返す ─────────

-- 参加者ごと・週ごとの「書いた日数」（日本時間）
create or replace function admin_writing_days()
returns table (
  room_name text, room_ref uuid, member_id uuid, display_name text, is_external boolean,
  week int, days_written int
) language plpgsql stable security definer set search_path = public as $$
declare
  p test_period;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into p from test_period where id = 1;
  if p is null then raise exception 'test period not set'; end if;
  return query
  select r.name, r.id, m.user_id, m.display_name, m.is_external, w.week,
         (select count(*)::int
            from writing_days wd
           where wd.room_id = m.room_id and wd.user_id = m.user_id
             and wd.day >= p.start_date + (w.week - 1) * 7
             and wd.day <  p.start_date + w.week * 7)
  from room_members m
  join rooms r on r.id = m.room_id
  cross join generate_series(1, p.weeks) as w(week)
  -- 動作確認用の部屋と、作り手（管理者）自身は数えない
  where not r.is_test
    and not exists (select 1 from admins a where a.user_id = m.user_id)
  order by r.name, m.display_name, w.week;
end;
$$;

-- 部屋ごと・日ごとに書いた人数（密度）
create or replace function admin_daily_density()
returns table (room_name text, day date, writers int, members int)
language plpgsql stable security definer set search_path = public as $$
declare
  p test_period;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into p from test_period where id = 1;
  if p is null then raise exception 'test period not set'; end if;
  return query
  select r.name, d.day::date,
         (select count(*)::int from writing_days wd
           where wd.room_id = r.id and wd.day = d.day::date
             and not exists (select 1 from admins a where a.user_id = wd.user_id)),
         (select count(*)::int from room_members m where m.room_id = r.id)
  from rooms r
  cross join generate_series(p.start_date, p.start_date + p.weeks * 7 - 1, interval '1 day') as d(day)
  where not r.is_test
  order by r.name, d.day;
end;
$$;

-- 予約ボタン・アンケートの集計
create or replace function admin_summary()
returns table (metric text, value int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select 'participants', (select count(distinct m.user_id)::int from room_members m join rooms r on r.id = m.room_id
                            where not r.is_test and not exists (select 1 from admins a where a.user_id = m.user_id))
  union all select 'booking_clicks', (select count(*)::int from booking_clicks)
  union all select 'booking_people', (select count(distinct user_id)::int from booking_clicks)
  union all select 'survey_very', (select count(*)::int from survey_responses s where s.answer = 'very'
                                     and exists (select 1 from room_members m where m.user_id = s.user_id))
  union all select 'survey_somewhat', (select count(*)::int from survey_responses s where s.answer = 'somewhat'
                                     and exists (select 1 from room_members m where m.user_id = s.user_id))
  union all select 'survey_not', (select count(*)::int from survey_responses s where s.answer = 'not'
                                     and exists (select 1 from room_members m where m.user_id = s.user_id));
end;
$$;

-- 管理者用：問題のある参加者を部屋から外す（その人の書き込みも消える）
create or replace function admin_remove_member(target_room uuid, target_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  insert into removed_members (room_id, user_id) values (target_room, target_user)
  on conflict do nothing;
  delete from room_members where room_id = target_room and user_id = target_user;
end;
$$;

-- 管理者用：招待リンクを作り直す（古いリンクは使えなくなる）
create or replace function admin_rotate_invite(target_room uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  code text := encode(extensions.gen_random_bytes(12), 'hex');
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update rooms set invite_code = code where id = target_room;
  return code;
end;
$$;
revoke all on function admin_remove_member(uuid, uuid) from public, anon;
revoke all on function admin_rotate_invite(uuid) from public, anon;
grant execute on function admin_remove_member(uuid, uuid) to authenticated;
grant execute on function admin_rotate_invite(uuid) to authenticated;

-- 管理者用：部屋の一覧と招待コード
create or replace function admin_rooms()
returns table (id uuid, name text, invite_code text, members int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select r.id, r.name, r.invite_code, (select count(*)::int from room_members m where m.room_id = r.id)
  from rooms r order by r.created_at;
end;
$$;

-- 関数はログインした人だけが呼べる（中で管理者かどうかを確かめる）
revoke all on function admin_writing_days() from public, anon;
revoke all on function admin_daily_density() from public, anon;
revoke all on function admin_summary() from public, anon;
revoke all on function admin_rooms() from public, anon;
revoke all on function is_room_member(uuid) from public, anon;
revoke all on function is_admin() from public, anon;
grant execute on function admin_writing_days() to authenticated;
grant execute on function admin_daily_density() to authenticated;
grant execute on function admin_summary() to authenticated;
grant execute on function admin_rooms() to authenticated;
grant execute on function is_room_member(uuid) to authenticated;
grant execute on function is_admin() to authenticated;

-- ───────── リアルタイム配信 ─────────
-- 追加・更新の通知は、受け取る人の読み取りルールで絞られる。
-- 削除の通知は絞られず誰でも購読できてしまうため、そもそも配信しない
-- （書き込みの削除は、他の人には次の読み込みで反映）。
alter publication supabase_realtime add table progress_posts;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime set (publish = 'insert, update');
