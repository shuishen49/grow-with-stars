import { useEffect, useState } from 'react'

export interface ToastMsg {
  text: string
  id: number
}

export default function Toast({ msg }: { msg: ToastMsg | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!msg) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2600)
    return () => clearTimeout(t)
  }, [msg?.id])

  if (!msg) return null
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div className="max-w-[85vw] truncate rounded-full bg-ink/90 px-5 py-2.5 text-sm text-white shadow-pop">
        {msg.text}
      </div>
    </div>
  )
}
