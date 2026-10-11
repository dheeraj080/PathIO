import { QRCodeSVG } from 'qrcode.react'

export function QrPanel({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
      <QRCodeSVG value={value} size={160} level="M" marginSize={2} />
      <p className="text-xs text-muted-foreground">Scan to open</p>
    </div>
  )
}
