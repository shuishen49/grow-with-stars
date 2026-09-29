import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** lg：平板上的表单弹窗（更宽一点，放得下输入框和头像格） */
  size?: 'md' | 'lg'
}

/** 底部弹层（平板上居中展示），样式对齐平板设计令牌 */
export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="tp-fade absolute inset-0 bg-ink/40" />
      <div className="absolute inset-0 flex items-end justify-center sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`tp-pop relative z-10 max-h-[86vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-pop sm:rounded-[24px] ${
            size === 'lg' ? 'sm:max-w-[560px]' : 'sm:max-w-md'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="min-w-0 text-lg font-extrabold text-ink">{title}</h3>
            <button
              aria-label="关闭"
              className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-mut hover:text-ink"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
