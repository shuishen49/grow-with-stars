import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** 底部弹层（平板上居中展示），样式对齐平板设计令牌 */
export default function Modal({ open, onClose, title, children }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/40" />
      <div className="absolute inset-0 flex items-end justify-center sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative z-10 max-h-[84vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-pop sm:max-w-md sm:rounded-[24px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-ink">{title}</h3>
            <button
              aria-label="关闭"
              className="tap flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-mut hover:text-ink"
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
