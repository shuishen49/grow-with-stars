// 删除一个 Supabase Auth 用户（连同其数据行），用于「重新注册一次」
// 用法：node --env-file=.env.local scripts/delete-user.mjs 邮箱 --yes
import { connect } from './lib/connect.mjs'

const email = process.argv[2]
const yes = process.argv.includes('--yes')

if (!email) {
  console.error('用法：node --env-file=.env.local scripts/delete-user.mjs 你的邮箱 --yes')
  process.exit(1)
}

const client = await connect()
try {
  const { rows } = await client.query(
    `select id, email, email_confirmed_at from auth.users where email = $1`,
    [email],
  )
  if (rows.length === 0) {
    console.log(`没找到 ${email}，无需删除。`)
    await client.end()
    process.exit(0)
  }
  const u = rows[0]
  console.log(`将删除用户：${u.email}（id=${u.id}，已确认=${u.email_confirmed_at ? '是' : '否'}）`)
  console.log(`该用户在 ledger 里的记录行数也会被一并删除（on delete cascade）。`)

  if (!yes) {
    console.log('\n这只是预览。确认要删，请在命令末尾加 --yes 再跑一次。')
    await client.end()
    process.exit(0)
  }

  const led = await client.query(`select count(*)::int as n from public.ledger where user_id = $1`, [
    u.id,
  ])
  await client.query(`delete from auth.users where id = $1`, [u.id])
  console.log(`\n已删除用户 ${u.email}，连带删除 ledger 记录 ${led.rows[0].n} 行。可以重新注册了。`)
} finally {
  await client.end()
}
