function Footer() {
  return (
    <p className="text-center text-xs text-zinc-400 py-8">
      Powered by Sunsent Interactive
    </p>
  )
}

interface PageLayoutProps {
  children: React.ReactNode
  centered?: boolean
}

export function PageLayout({ children, centered = false }: PageLayoutProps) {
  if (centered) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <Footer />
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-10">{children}</div>
      <Footer />
    </div>
  )
}
