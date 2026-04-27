const safeArea: React.CSSProperties = {
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
}

function Footer() {
  return (
    <p className="text-center text-xs text-zinc-400 pt-4">
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
      <div className="min-h-screen bg-zinc-50 flex flex-col" style={safeArea}>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <Footer />
      </div>
    )
  }
  return (
    <div className="min-h-svh bg-zinc-50 flex flex-col" style={safeArea}>
      <div className="flex-1 w-full max-w-lg mx-auto">{children}</div>
      <Footer />
    </div>
  )
}
