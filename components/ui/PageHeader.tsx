import { Spinner } from './Spinner'

interface PageHeaderProps {
  title: string
  subtitle?: string
  isOpen?: boolean | null
  className?: string
}

export function PageHeader({ title, subtitle, isOpen, className = '' }: PageHeaderProps) {
  const today = (() => {
    const d = new Date()
    const wd = d.toLocaleDateString('en-GB', { weekday: 'long' })
    const day = d.getDate()
    const mo = d.toLocaleDateString('en-GB', { month: 'long' })
    return `${wd}, ${day} ${mo}`
  })()

  return (
    <div className={`flex flex-col items-center text-center gap-4 ${className}`}>
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>

      {isOpen !== undefined && (
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm text-zinc-500">{today}</p>
          {isOpen === null ? (
            <Spinner />
          ) : (
            <p className={`text-xl ${isOpen ? 'text-green-500' : 'text-red-400'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </p>
          )}
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
