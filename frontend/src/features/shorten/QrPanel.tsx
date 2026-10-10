import { QRCodeSVG } from 'qrcode.react'

export function QrPanel({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <QRCodeSVG value={value} size={160} level="M" marginSize={2} />
      <p className="text-xs text-slate-500 dark:text-slate-400">Scan to open</p>
    </div>
  )
}
