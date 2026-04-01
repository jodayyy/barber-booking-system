interface PageHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function PageHeader({ title, subtitle, className = '' }: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">{title}</h1>
      {subtitle && <p className="text-zinc-500 text-sm">{subtitle}</p>}
    </div>
  )
}
