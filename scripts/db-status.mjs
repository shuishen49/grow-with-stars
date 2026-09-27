// 体检：看看数据库还差什么（只读）
// 用法：node --env-file=.env.local scripts/db-status.mjs
import { connect } from './lib/connect.mjs'

const client = await connect()
const ok = (b) => (b ? '✓ 已就绪' : '✗ 还没做')

try {
  const t = await client.query(
    `select to_regclass('public.ledger') is not null as has_table`,
  )
  console.log('1) ledger 表存在           ', ok(t.rows[0].has_table))
  if (!t.rows[0].has_table) {
    console.log('   → 先把 supabase/setup.sql 整份粘到 SQL Editor 跑一次')
    await client.end()
    process.exit(0)
  }

  const c = await client.query(
    `select exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name='ledger' and column_name='user_id') as has_uid`,
  )
  console.log('2) ledger.user_id 列存在   ', ok(c.rows[0].has_uid))
  console.log('   （缺失就跑：node --env-file=.env.local scripts/apply-auth-migration.mjs）')

  const rls = await client.query(
    `select relrowsecurity from pg_class where oid = 'public.ledger'::regclass`,
  )
  console.log('3) ledger 开了 RLS          ', ok(rls.rows[0].relrowsecurity))

  const p = await client.query(
    `select policyname, cmd, roles from pg_policies where schemaname='public' and tablename='ledger'`,
  )
  console.log('4) RLS 策略                 ', p.rows.length ? p.rows.map((x) => x.policyname).join(', ') : '✗ 无')
  const hasOwn = p.rows.some((x) => x.policyname === 'own_rows')
  console.log('   own_rows（只读写自己的） ', ok(hasOwn))

  const u = await client.query(
    `select u.id, u.email, u.email_confirmed_at,
            (u.encrypted_password is not null and u.encrypted_password <> '') as has_password
     from auth.users u order by u.created_at`,
  )
  console.log('5) 已注册用户')
  for (const x of u.rows) {
    console.log(
      `   ${x.email}  已确认=${x.email_confirmed_at ? '是' : '否'}  已设密码=${x.has_password ? '是' : '否'}`,
    )
  }

  if (c.rows[0].has_uid) {
    const n = await client.query(
      `select count(*)::int as total,
              count(*) filter (where user_id is null)::int as unclaimed
       from public.ledger`,
    )
    console.log(
      '6) ledger 数据              共',
      n.rows[0].total,
      '行，其中未认领(user_id 为空)',
      n.rows[0].unclaimed,
      '行',
    )
    if (n.rows[0].unclaimed > 0) {
      console.log('   → 登录后跑：node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱')
    }
  } else {
    console.log('6) ledger 数据              （user_id 列还没有，跳过）')
  }
} finally {
  await client.end()
}
