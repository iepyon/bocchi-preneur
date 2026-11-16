-- 試作品用のテーブル（ステップ4）
-- 注意：試作品はログインなし・ダミーデータ専用。誰でも読み書きできるルールにしている。
-- 本物の事業アイデアは入れないこと。本番（ステップ7）でログインとルールを作り直す。

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  is_external boolean not null default false, -- 社外の人かどうか（「部屋は社外の人も入れるように」）
  created_at timestamptz not null default now()
);

create table progress_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  did text not null check (char_length(did) between 1 and 500),
  next_step text check (char_length(next_step) <= 500),
  blocked text check (char_length(blocked) <= 500),
  created_at timestamptz not null default now()
);
create index progress_posts_room_created on progress_posts (room_id, created_at desc);
create index progress_posts_member_created on progress_posts (member_id, created_at desc);

-- 15分相談の予約ボタンが押された記録（受け入れ条件3）。実際の予約はしない。
create table booking_clicks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  slot_label text not null check (char_length(slot_label) <= 100),
  clicked_at timestamptz not null default now()
);

-- 進捗へのリアクション（いいね）。1人1投稿につき1回まで。押し直すと取り消し。
create table reactions (
  post_id uuid not null references progress_posts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

-- 各メンバーの最終更新日時（受け入れ条件2：1週間更新がない人）
create view member_status with (security_invoker = true) as
select m.id, m.room_id, m.name, m.is_external, m.created_at,
       p.created_at as last_posted_at,
       p.did as last_did
from members m
left join lateral (
  select created_at, did from progress_posts pp
  where pp.member_id = m.id
  order by created_at desc limit 1
) p on true;

-- アクセスのきまり（試作品用：ログインなしで誰でも読める・書ける。消す・書き換えるはできない）
alter table rooms enable row level security;
alter table members enable row level security;
alter table progress_posts enable row level security;
alter table booking_clicks enable row level security;
alter table reactions enable row level security;

create policy "prototype read rooms" on rooms for select to anon using (true);
create policy "prototype read members" on members for select to anon using (true);
create policy "prototype read posts" on progress_posts for select to anon using (true);
create policy "prototype insert posts" on progress_posts for insert to anon with check (true);
create policy "prototype read clicks" on booking_clicks for select to anon using (true);
create policy "prototype insert clicks" on booking_clicks for insert to anon with check (true);

create policy "prototype read reactions" on reactions for select to anon using (true);
create policy "prototype insert reactions" on reactions for insert to anon with check (true);
-- 取り消し（いいねを外す）だけは削除を許す。試作品なので誰の分でも消せてしまう点に注意（本番で本人限定にする）
create policy "prototype delete reactions" on reactions for delete to anon using (true);

grant select on member_status to anon;

-- リアルタイム配信（受け入れ条件1・いいね）
alter publication supabase_realtime add table progress_posts;
alter publication supabase_realtime add table reactions;
-- 削除通知には主キー（post_id, member_id）が入るので、いいねを外したことも画面に届く。
-- 注意（本番）：削除通知は読み取りルールで絞られず全員に届く。本番では通知の作りを見直す。
