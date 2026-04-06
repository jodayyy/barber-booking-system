import { Spinner } from './Spinner'

interface PageHeaderProps {
  title: string
  subtitle?: string
  isOpen?: boolean | null
  className?: string
}

export function PageHeader({ title, subtitle, isOpen, className = '' }: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold text-zinc-900 mb-3 text-center">{title}</h1>
      {isOpen !== undefined && (
        <div className="flex items-center justify-center h-8">
          {isOpen === null ? (
            <Spinner />
          ) : (
            <p className={`text-xl ${isOpen ? 'text-green-500' : 'text-red-400'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </p>
          )}
        </div>
      )}
      {subtitle && <p className="text-zinc-500 text-sm text-center">{subtitle}</p>}
    </div>
  )
}
