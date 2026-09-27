// 把纸质《积分登记表》导入到指定账号（会先校验明细能不能算平）
// 预览：node --env-file=.env.local scripts/import-ledger.mjs 邮箱
// 写入：node --env-file=.env.local scripts/import-ledger.mjs 邮箱 --yes
import { connect } from './lib/connect.mjs'

const EMAIL = process.argv[2] || '93418328@qq.com'
const YES = process.argv.includes('--yes')

/** 纸质表原始数据：日期 / 当日增减 / 明细（空白日期不建记录） */
const DATA = [
  ['2026-09-01', 3, '晨读+1、记单词+1、完成所有作业+1'],
  ['2026-09-02', 3, '晨读+1、记单词+1、听默写+1'],
  ['2026-09-03', 3, '晨读+1、记单词+1、听默写+1'],
  ['2026-09-04', 2, '记单词+1、听默写-1、数学老师表扬+2'],
  ['2026-09-05', 2, '上午完成校内单元复习+2'],
  ['2026-09-06', 0, '水杯遗忘-2、提前完成雷老师作业+2'],
  ['2026-09-07', 0, '记单词+1、听默写+1、晚睡-2'],
  ['2026-09-08', 4, '记单词+1、听默写+1、按时完成所有作业+2'],
  ['2026-09-09', 3, '记单词+1、听默写-1、按时睡觉+2'],
  ['2026-09-10', 4, '提前完成所有作业+2、按时睡觉+2'],
  ['2026-09-11', 9, '按时完成校内周末作业+2、听默写-1、五美少年+8'],
  ['2026-09-12', 4, '早上提前开始学习+2、提前完成奥数作业+2'],
  ['2026-09-14', 7, '听默写+1、记单词+1、坚持上学+2、完成所有作业+2、提前睡觉+1'],
  ['2026-09-15', -5, '语文一单元A -5'],
  ['2026-09-16', 3, '听默写+1、记单词+1、计算+1'],
  ['2026-09-17', 1, '听默写-1、记单词+1、计算+1'],
  ['2026-09-18', 6, '按时完成周末作业+2、练舞+2、数学老师表扬+2'],
  ['2026-09-20', 5, '听写+1、记单词+1、计算+1、完成奥数作业+2'],
  ['2026-09-21', 2, '记单词+1、计算+1、作文+1、没有做奥数-1'],
  ['2026-09-22', 0, '记单词+1、计算+1、晚睡-2'],
  ['2026-09-23', 11, '听写+1、记单词+1、计算+1、月度数学之星+8'],
  ['2026-09-24', 3, '听写+1、记单词+1、计算+1'],
]

/** 和前端 parseDetail 完全一致的解析，用来校验 */
function parseDetail(detail) {
  return detail
    .split(/[、，,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.+?)\s*([+-]\d+)分?$/)
      if (m) return { name: m[1].trim(), delta: parseInt(m[2], 10) }
      return { name: s, delta: 0, bad: true }
    })
}

const client = await connect()
try {
  const { rows: users } = await client.query(`select id, email from auth.users where email = $1`, [EMAIL])
  if (users.length === 0) {
    console.error(`找不到账号 ${EMAIL}。请先在平板上注册，再跑这个脚本。`)
    process.exit(1)
  }
  const uid = users[0].id
  console.log(`目标账号：${EMAIL} (${uid})`)

  console.log('\n校验明细（明细分项之和 vs 当日增减）：')
  let run = 0
  const warns = []
  for (const [date, delta, detail] of DATA) {
    const parts = parseDetail(detail)
    const sum = parts.reduce((s, p) => s + p.delta, 0)
    const bad = parts.filter((p) => p.bad)
    run += delta
    const ok = sum === delta && bad.length === 0
    console.log(
      `  ${date}  ${String(delta).padStart(3)}  明细合计 ${String(sum).padStart(3)}  余额 ${String(run).padStart(3)}  ${ok ? '✓' : '⚠ 不平'}  ${detail}`,
    )
    if (!ok) warns.push(`${date}: 明细合计 ${sum}，但当日增减写的是 ${delta}`)
    if (bad.length) warns.push(`${date}: 有条目没能解析 -> ${bad.map((b) => b.name).join(' / ')}`)
  }
  console.log(`\n导入后期末余额 = ${run}`)
  if (warns.length) console.log('\n注意：\n  ' + warns.join('\n  '))

  const before = await client.query(
    `select count(*) filter (where user_id = $1)::int as mine,
            count(*) filter (where user_id is null)::int as unclaimed
     from public.ledger`,
    [uid],
  )
  console.log(
    `\n当前 ledger：该账号已有 ${before.rows[0].mine} 行，未认领(旧的种子数据) ${before.rows[0].unclaimed} 行`,
  )
  console.log(`本次将写入 ${DATA.length} 行`)

  if (!YES) {
    console.log('\n这只是预览。确认无误请在命令末尾加 --yes 再跑一次。')
    process.exit(0)
  }

  await client.query('begin')
  await client.query(`delete from public.ledger where user_id = $1 or user_id is null`, [uid])
  for (const [date, delta, detail] of DATA) {
    await client.query(
      `insert into public.ledger (user_id, entry_date, kind, detail, delta)
       values ($1, $2, 'score', $3, $4)`,
      [uid, date, detail, delta],
    )
  }
  await client.query('commit')

  const after = await client.query(
    `select coalesce(sum(delta),0)::int as balance, count(*)::int as n from public.ledger where user_id = $1`,
    [uid],
  )
  console.log(`\n已导入：${after.rows[0].n} 行，余额 ${after.rows[0].balance} 分。`)
  console.log('现在在平板上刷新（或点右上角刷新按钮）就能看到这些数据了。')
} finally {
  await client.end()
}
