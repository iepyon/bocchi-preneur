-- 手元で試すための初期データ（ダミー）
-- 検証期間：開始日は本番の開始に合わせて /admin から変える
insert into test_period (id, start_date, weeks) values (1, '2026-12-08', 2);

-- 手元確認用の部屋。招待リンク： http://127.0.0.1:3000/join/local-test-room-1
-- 注意：推測しやすいコードなので、本番のデータベースにはこの seed を流さないこと
insert into rooms (id, name, invite_code, is_test) values
  ('00000000-0000-0000-0000-000000000001', 'テスト部屋（ダミー）', 'local-test-room-1', true);
