export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-400 animate-spin ${className}`} />
  )
}
