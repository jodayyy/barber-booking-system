export function BookingDetailRow({
  label,
  value,
  valueClassName = 'text-sm font-medium text-zinc-900',
}: {
  label: string
  value: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex justify-between px-5 py-4">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  )
}
