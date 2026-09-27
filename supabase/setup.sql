-- ============================================================
-- 家庭积分本 · Supabase 初始化脚本
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴全部内容 → Run
-- 可重复运行（重复执行不会产生重复数据）
-- ============================================================

create table if not exists public.ledger (
  id         bigint      generated always as identity primary key,
  user_id    uuid        references auth.users(id) on delete cascade default auth.uid(),
  entry_date date        not null,
  kind       text        not null check (kind in ('score', 'redeem')),
  detail     text        not null default '',
  delta      int         not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entry_date_idx on public.ledger (entry_date);
create index if not exists ledger_user_id_idx on public.ledger (user_id);

-- 每个账号每天最多一条打分 + 一条兑换
create unique index if not exists ledger_user_date_kind_uidx
  on public.ledger (user_id, entry_date, kind);

-- 未认领的历史行按日期去重（保证本脚本可重复执行）
create unique index if not exists ledger_unclaimed_date_kind_uidx
  on public.ledger (entry_date, kind)
  where user_id is null;

alter table public.ledger enable row level security;

-- 未登录不能读写；登录后只能读写自己的行
drop policy if exists "family_all_access" on public.ledger;
drop policy if exists "own_rows" on public.ledger;

create policy "own_rows"
  on public.ledger
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 2026年9月历史积分（与纸质登记表一致）
-- 注：9月9日纸质表明细合计+2、当日增减记+3，此处按纸质表数字录入
-- user_id 留空，注册后用 node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱 认领
-- ------------------------------------------------------------
insert into public.ledger (entry_date, kind, detail, delta) values
  ('2026-09-01', 'score', '晨读+1、记单词+1、完成所有作业+1', 3),
  ('2026-09-02', 'score', '晨读+1、记单词+1、听默写+1', 3),
  ('2026-09-03', 'score', '晨读+1、记单词+1、听默写+1', 3),
  ('2026-09-04', 'score', '记单词+1、听默写-1、数学老师表扬+2', 2),
  ('2026-09-05', 'score', '上午完成校内单元复习+2', 2),
  ('2026-09-06', 'score', '水杯遗忘-2、提前完成雷老师作业+2', 0),
  ('2026-09-07', 'score', '记单词+1、听默写+1、晚睡-2', 0),
  ('2026-09-08', 'score', '记单词+1、听默写+1、按时完成所有作业+2', 4),
  ('2026-09-09', 'score', '记单词+1、听默写-1、按时睡觉+2', 3),
  ('2026-09-10', 'score', '提前完成所有作业+2、按时睡觉+2', 4),
  ('2026-09-11', 'score', '按时完成校内周末作业+2、听默写-1、五美少年+8', 9),
  ('2026-09-12', 'score', '早上提前开始学习+2、提前完成奥数作业+2', 4),
  ('2026-09-14', 'score', '听默写+1、记单词+1、坚持上学+2、完成所有作业+2、提前睡觉+1', 7),
  ('2026-09-15', 'score', '语文一单元A -5', -5),
  ('2026-09-16', 'score', '听默写+1、记单词+1、计算+1', 3),
  ('2026-09-17', 'score', '听默写-1、记单词+1、计算+1', 1),
  ('2026-09-18', 'score', '按时完成周末作业+2、练舞+2、数学老师表扬+2', 6),
  ('2026-09-20', 'score', '听写+1、记单词+1、计算+1、完成奥数作业+2', 5),
  ('2026-09-21', 'score', '记单词+1、计算+1、作文+1、没有做奥数-1', 2),
  ('2026-09-22', 'score', '记单词+1、计算+1、晚睡-2', 0),
  ('2026-09-23', 'score', '听写+1、记单词+1、计算+1、月度数学之星+8', 11),
  ('2026-09-24', 'score', '听写+1、记单词+1、计算+1', 3)
on conflict do nothing;
