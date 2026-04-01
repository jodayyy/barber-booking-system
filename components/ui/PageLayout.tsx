interface PageLayoutProps {
  children: React.ReactNode
  centered?: boolean
}

export function PageLayout({ children, centered = false }: PageLayoutProps) {
  if (centered) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-lg mx-auto px-4 py-10">{children}</div>
    </div>
  )
}
