import { useState } from 'react'
import setupSql from '../../supabase/setup.sql?raw'

interface Props {
  error: string
  onRetry: () => void
  onDemo: () => void
}

export default function SetupGuide({ error, onRetry, onDemo }: Props) {
  const [copied, setCopied] = useState(false)

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(setupSql)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = setupSql
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card mx-auto max-w-2xl p-6">
      <img src="/ui/mascot-books.webp" alt="" aria-hidden className="h-20 object-contain" />
      <h2 className="mt-2 text-lg font-bold">数据库还未初始化</h2>
      <p className="mt-1 text-sm text-mut">
        只需一次：把下面的 SQL 粘贴到 Supabase 控制台的 SQL Editor 里运行，即可建表并导入 9
        月历史积分。
      </p>
      {error && (
        <p className="mt-2 rounded-ctl bg-rosy px-3 py-2 text-xs text-posdeep">{error}</p>
      )}
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink/75">
        <li>
          打开{' '}
          <a
            className="font-medium text-brand underline"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            supabase.com/dashboard
          </a>{' '}
          进入本项目 → 左侧「SQL Editor」
        </li>
        <li>点「New query」，粘贴下面全部 SQL，点「Run」</li>
        <li>回到本页，点「重新检测」</li>
      </ol>
      <pre className="mt-4 max-h-64 overflow-auto rounded-ctl bg-[#202B49] p-4 text-xs leading-relaxed text-[#9BE8C8]">
        {setupSql}
      </pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={copySql} className="btn-primary px-5 py-3">
          {copied ? '✅ 已复制' : '📋 复制 SQL'}
        </button>
        <button
          onClick={onRetry}
          className="tap rounded-ctl bg-canvas px-5 py-3 font-medium text-ink hover:bg-line"
        >
          🔄 重新检测
        </button>
        <button
          onClick={onDemo}
          className="tap rounded-ctl bg-peach px-5 py-3 font-medium text-golddeep"
        >
          🎈 先体验演示模式
        </button>
      </div>
    </div>
  )
}
