// 把 user_id 为空的历史数据认领到指定邮箱账号下
// 用法：node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱
// 前置：先在网页上用这个邮箱注册并登录一次
import { connect } from './lib/connect.mjs'

const email = process.argv[2]
if (!email) {
  console.error('用法：node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱')
  process.exit(1)
}

const client = await connect()

try {
  const u = await client.query('select id, email from auth.users where email = $1', [email])
  if (u.rows.length === 0) {
    console.error(`找不到邮箱 ${email} 对应的账号。请先在网页上注册并登录一次。`)
    process.exit(1)
  }
  const uid = u.rows[0].id

  const before = await client.query(
    'select count(*)::int as n from public.ledger where user_id is null',
  )
  console.log(`账号 ${email} (${uid})`)
  console.log(`待认领记录：${before.rows[0].n} 条`)

  if (before.rows[0].n === 0) {
    console.log('没有需要认领的记录，结束。')
  } else {
    // 目标账号同一天已有记录时跳过，避免覆盖已录入的数据
    const res = await client.query(
      `update public.ledger l
          set user_id = $1
        where l.user_id is null
          and not exists (
            select 1 from public.ledger o
             where o.user_id = $1 and o.entry_date = l.entry_date and o.kind = l.kind
          )`,
      [uid],
    )
    console.log(`已认领 ${res.rowCount} 条`)

    const left = await client.query(
      'select entry_date, kind from public.ledger where user_id is null order by entry_date',
    )
    if (left.rows.length > 0) {
      console.log(`\n以下 ${left.rows.length} 条因目标账号同一天已有记录而跳过：`)
      for (const r of left.rows) console.log(`  ${r.entry_date} ${r.kind}`)
    }
  }

  const after = await client.query(
    'select count(*)::int as n, coalesce(sum(delta),0)::int as total from public.ledger where user_id = $1',
    [uid],
  )
  console.log(`\n该账号现有 ${after.rows[0].n} 条，累计余额 ${after.rows[0].total}`)
} finally {
  await client.end()
}
