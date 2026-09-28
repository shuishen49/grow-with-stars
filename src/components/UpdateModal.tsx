import Modal from './Modal'
import { humanSize, type HotUpdateInfo } from '../lib/hotUpdate'

interface Props {
  info: HotUpdateInfo | null
  busy: boolean
  /** true = 已经装完、这次是「更新完成」的展示；false = 询问是否更新 */
  installed?: boolean
  onConfirm: () => void
  onLater: () => void
}

/** 更新弹窗：先把「改了什么」摆出来，家长看完再决定要不要更 */
export default function UpdateModal({ info, busy, installed = false, onConfirm, onLater }: Props) {
  if (!info) return null
  const notes = info.notes.length > 0 ? info.notes : ['（这次没写更新说明，一般是小修小补）']
  const pkg = humanSize(info.size)

  return (
    <Modal open onClose={busy ? () => {} : onLater} title={installed ? '✅ 更新完成' : '🆕 有新版本'}>
      <div className="rounded-ctl bg-brand-soft px-4 py-3 text-sm text-ink/80">
        <div className="font-bold text-brand">
          {installed ? `已更新到 ${info.version}` : `版本 ${info.version}`}
        </div>
        {info.publishedAt && (
          <div className="mt-0.5 text-xs text-mut">发布于 {info.publishedAt}</div>
        )}
      </div>

      <div className="mt-3 font-bold text-ink">这次更新了什么</div>
      <ul className="mt-1.5 space-y-1.5">
        {notes.map((n, i) => (
          <li key={i} className="flex gap-2 text-sm leading-6 text-ink/80">
            <span className="shrink-0 text-brand">·</span>
            <span className="min-w-0">{n}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-ctl bg-canvas px-4 py-2.5 text-xs leading-6 text-mut">
        {installed
          ? '如果哪里看着不对，可以在「规则」页里点「检查更新」再拉一次。'
          : busy
            ? '正在下载并替换界面包，完成后 App 会自动重启一次。网络慢的话可能要等半分钟，别退出。'
            : `更新只换界面和逻辑，不动你记的分数；${
                pkg ? `要下 ${pkg}，` : ''
              }更新完会自动重启一次。`}
      </p>

      <div className="mt-4 flex gap-2">
        {!installed && (
          <button
            onClick={onLater}
            disabled={busy}
            className="tap flex min-h-[48px] flex-1 items-center justify-center rounded-ctl bg-canvas text-sm font-medium text-mut hover:text-ink disabled:opacity-40"
          >
            稍后再说
          </button>
        )}
        <button
          onClick={onConfirm}
          disabled={busy}
          className="btn-primary flex min-h-[48px] flex-1 items-center justify-center text-base disabled:opacity-40"
        >
          {installed ? '知道了' : busy ? '下载中…' : '立即更新'}
        </button>
      </div>
    </Modal>
  )
}
