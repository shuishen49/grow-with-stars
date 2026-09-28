// 只读：导出某个用户的 ledger 明细，用来核对账目
// 用法：node --env-file=.env.local scripts/dump-ledger.mjs 邮箱
import { connect } from './lib/connect.mjs'

const email = process.argv[2]
const client = await connect()
try {
  const u = await client.query(`select id from auth.users where email = $1`, [email])
  if (!u.rows.length) {
    console.log('没这个用户')
    process.exit(0)
  }
  const { rows } = await client.query(
    `select entry_date, kind, detail, delta from public.ledger
     where user_id = $1 order by entry_date asc, kind asc`,
    [u.rows[0].id],
  )
  console.log(`用户 ${email} 共 ${rows.length} 行：\n`)
  let bal = 0
  for (const r of rows) {
    const d = r.entry_date instanceof Date ? r.entry_date.toISOString().slice(0, 10) : r.entry_date
    bal += Number(r.delta)
    console.log(
      `  ${d}  ${r.kind === 'score' ? '打分' : '兑换'}  ${String(r.delta).padStart(4)}  ` +
        `${(r.detail || '').slice(0, 40).padEnd(40)}  累计 ${bal}`,
    )
  }
  console.log(`\n余额 = ${bal}`)
} finally {
  await client.end()
}
