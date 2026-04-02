interface PageHeaderProps {
  title: string
  subtitle?: string
  isOpen?: boolean | null
  className?: string
}

export function PageHeader({ title, subtitle, isOpen, className = '' }: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1 text-center">{title}</h1>
      {isOpen !== undefined && (
        <div className="flex items-center justify-center h-7">
          {isOpen === null ? (
            <div className="w-4 h-4 rounded-full border-2 border-zinc-200 border-t-zinc-400 animate-spin" />
          ) : (
            <p className={`text-lg font-medium ${isOpen ? 'text-green-500' : 'text-red-400'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </p>
          )}
        </div>
      )}
      {subtitle && <p className="text-zinc-500 text-sm text-center">{subtitle}</p>}
    </div>
  )
}
