/**
 * 管理模式里的两个弹窗：
 *  - AddItemModal：往某个大类里加一条自己的加减分项
 *  - CatEditModal：新增一个大类 / 给大类改名（顺手挑头像）
 *
 * 之前这两个都是直接展开在页面里的虚线框，挤一行不好看，现在统一改成居中弹窗。
 */
import { useState } from 'react'
import Modal from './Modal'
import { CAT_EMOJI_CHOICES } from '../lib/cats'

function sign(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

/** 快捷分值 */
const PRESETS = [1, 2, 3, 5, 10]

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-sm font-bold text-ink">{children}</span>
      {hint && <span className="text-xs text-mut">{hint}</span>}
    </div>
  )
}

const inputCls =
  'min-h-[52px] w-full rounded-ctl border-2 border-line bg-canvas px-4 text-[17px] font-semibold outline-none transition-colors placeholder:font-normal placeholder:text-mut/60 focus:border-brand focus:bg-white'

function Actions({
  onCancel,
  onSave,
  disabled,
  saveText = '保存',
}: {
  onCancel: () => void
  onSave: () => void
  disabled?: boolean
  saveText?: string
}) {
  return (
    <div className="mt-5 flex gap-3">
      <button
        onClick={onCancel}
        className="tap flex min-h-[52px] flex-1 items-center justify-center rounded-ctl bg-canvas text-base font-bold text-mut"
      >
        取消
      </button>
      <button
        disabled={disabled}
        onClick={onSave}
        className="btn-primary flex min-h-[52px] flex-[1.4] items-center justify-center rounded-ctl text-base"
      >
        {saveText}
      </button>
    </div>
  )
}

/** 分类里的「＋」：弹窗加一项，带实时预览 */
export function AddItemModal({
  catName,
  onClose,
  onSave,
}: {
  catName: string
  onClose: () => void
  onSave: (name: string, delta: number) => void
}) {
  const [name, setName] = useState('')
  const [pts, setPts] = useState(1)
  const [reward, setReward] = useState(true)
  const delta = reward ? pts : -pts

  const submit = () => {
    const n = name.trim()
    if (!n) return
    onSave(n, delta)
  }

  return (
    <Modal open onClose={onClose} title={`往「${catName}」里加一项`} size="lg">
      <div className="space-y-5">
        <div>
          <Label hint="写孩子看得懂的话">这项叫什么？</Label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="如：帮忙做家务"
            className={inputCls}
            aria-label="项目名称"
          />
        </div>

        <div>
          <Label>一次多少分？</Label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-ctl bg-canvas p-1">
              <button
                aria-label="减少分值"
                className="tap flex h-11 w-11 items-center justify-center rounded-[10px] bg-white text-xl font-bold text-ink shadow-card"
                onClick={() => setPts((p) => Math.max(1, p - 1))}
              >
                −
              </button>
              <span className="w-12 text-center text-xl font-extrabold tabular-nums">{pts}</span>
              <button
                aria-label="增加分值"
                className="tap flex h-11 w-11 items-center justify-center rounded-[10px] bg-white text-xl font-bold text-ink shadow-card"
                onClick={() => setPts((p) => Math.min(50, p + 1))}
              >
                ＋
              </button>
            </div>
            <div className="flex items-center gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => setPts(v)}
                  aria-pressed={pts === v}
                  className={`tap flex h-11 min-w-[44px] items-center justify-center rounded-[10px] border-2 px-2 text-sm font-bold tabular-nums ${
                    pts === v ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-mut'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label>加分还是扣分？</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              aria-pressed={reward}
              onClick={() => setReward(true)}
              className={`tap flex min-h-[56px] items-center justify-center gap-2 rounded-ctl border-2 text-base font-bold ${
                reward ? 'border-pos bg-rosy text-posdeep' : 'border-line bg-white text-mut'
              }`}
            >
              <span aria-hidden>➕</span> 奖励
            </button>
            <button
              aria-pressed={!reward}
              onClick={() => setReward(false)}
              className={`tap flex min-h-[56px] items-center justify-center gap-2 rounded-ctl border-2 text-base font-bold ${
                !reward ? 'border-neg bg-mint text-negdeep' : 'border-line bg-white text-mut'
              }`}
            >
              <span aria-hidden>➖</span> 扣分
            </button>
          </div>
        </div>

        <div className="rounded-ctl bg-canvas p-4">
          <div className="mb-2 text-xs font-bold text-mut">保存后长这样</div>
          <div
            className={`flex min-h-[52px] items-center justify-between gap-3 rounded-ctl border bg-white px-4 text-left text-[15px] leading-snug ${
              reward ? 'border-pos/50' : 'border-neg/50'
            }`}
          >
            <span className={`min-w-0 flex-1 ${name.trim() ? 'font-bold' : 'text-mut/60'}`}>
              {name.trim() || '给它起个名字'}
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
                reward ? 'bg-rosy text-posdeep' : 'bg-mint text-negdeep'
              }`}
            >
              {sign(delta)}
            </span>
          </div>
        </div>

        <Actions onCancel={onClose} onSave={submit} disabled={!name.trim()} />
      </div>
    </Modal>
  )
}

/** 新增大类 / 给大类改名；allowEmoji=false 时（内置大类）只改名字 */
export function CatEditModal({
  title,
  initName,
  initEmoji,
  allowEmoji = true,
  onClose,
  onSave,
}: {
  title: string
  initName: string
  initEmoji: string
  allowEmoji?: boolean
  onClose: () => void
  onSave: (name: string, emoji: string) => void
}) {
  const [name, setName] = useState(initName)
  const [emoji, setEmoji] = useState(initEmoji || CAT_EMOJI_CHOICES[0])

  const submit = () => {
    const n = name.trim()
    if (!n) return
    onSave(n, emoji)
  }

  return (
    <Modal open onClose={onClose} title={title} size="lg">
      <div className="space-y-5">
        {allowEmoji && (
          <div className="flex justify-center">
            <span
              aria-hidden
              className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-4xl shadow-card"
            >
              {emoji}
            </span>
          </div>
        )}

        <div>
          <Label hint="最多 10 个字最好记">名字</Label>
          <input
            autoFocus
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.currentTarget.select()} // 点一下全选，直接打字就覆盖旧名字
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="如：家务小能手"
            className={inputCls}
            aria-label="分类名字"
          />
        </div>

        {allowEmoji && (
          <div>
            <Label>挑个头像</Label>
            <div className="grid grid-cols-6 gap-2 tb:grid-cols-8">
              {CAT_EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  aria-label={`头像 ${e}`}
                  aria-pressed={emoji === e}
                  className={`tap flex h-12 w-full items-center justify-center rounded-[14px] border-2 text-2xl ${
                    emoji === e ? 'border-brand bg-brand-soft' : 'border-transparent bg-canvas'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="rounded-ctl bg-brand-soft px-4 py-3 text-xs leading-6 text-brand">
          💡 名字改了以后，打分页和规则页都跟着变；已经打过的分不会受影响。
        </p>

        <Actions onCancel={onClose} onSave={submit} disabled={!name.trim()} />
      </div>
    </Modal>
  )
}
