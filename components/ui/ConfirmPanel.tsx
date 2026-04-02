import { Button } from './Button'

interface ConfirmPanelProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  disabled?: boolean
  error?: string
  size?: 'md' | 'sm'
}

export function ConfirmPanel({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  disabled = false,
  error,
  size = 'md',
}: ConfirmPanelProps) {
  return (
    <div>
      <p className="text-sm font-medium text-zinc-900 mb-1">{title}</p>
      <p className={`text-sm text-zinc-500 ${size === 'sm' ? 'mb-4' : 'mb-5'}`}>{description}</p>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className={`flex ${size === 'sm' ? 'gap-2' : 'gap-3'}`}>
        <Button variant="secondary" size={size} onClick={onCancel} disabled={disabled} className="flex-1">
          {cancelLabel}
        </Button>
        <Button variant="danger" size={size} onClick={onConfirm} disabled={disabled} className="flex-1">
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
