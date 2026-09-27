// 执行 supabase/auth-migration.sql（加 user_id、收紧 RLS）
// 用法：node --env-file=.env.local scripts/apply-auth-migration.mjs
import { readFileSync } from 'node:fs'
import { connect } from './lib/connect.mjs'

const client = await connect()

try {
  const sql = readFileSync(new URL('../supabase/auth-migration.sql', import.meta.url), 'utf8')
  await client.query(sql)
  console.log('\nauth-migration.sql 执行完成')

  const cols = await client.query(
    `select column_name, data_type, is_nullable from information_schema.columns
     where table_schema='public' and table_name='ledger' order by ordinal_position`,
  )
  console.log('\nledger 列：')
  for (const c of cols.rows) console.log(`  ${c.column_name} ${c.data_type} (null=${c.is_nullable})`)

  const pol = await client.query(
    `select policyname, roles, cmd from pg_policies where schemaname='public' and tablename='ledger'`,
  )
  console.log('\nRLS 策略：')
  if (pol.rows.length === 0) console.log('  （无）')
  for (const p of pol.rows) console.log(`  ${p.policyname} → ${p.roles} / ${p.cmd}`)

  const { rows } = await client.query(
    `select count(*)::int as total, count(*) filter (where user_id is null)::int as unclaimed from public.ledger`,
  )
  console.log(`\n记录总数 ${rows[0].total}，其中未认领 ${rows[0].unclaimed} 条`)
  if (rows[0].unclaimed > 0) {
    console.log(
      `提示：注册账号后运行 node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱 认领历史数据`,
    )
  }
} finally {
  await client.end()
}
