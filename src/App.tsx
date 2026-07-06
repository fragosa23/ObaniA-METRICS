import { useState } from 'react'
import { Button } from '@/components/ui/button'

const STATUS = [
  { label: '0 RNC — Ótimo', className: 'bg-success text-success-foreground' },
  { label: 'Atenção', className: 'bg-warning text-warning-foreground' },
  { label: 'Crítico', className: 'bg-destructive text-white' },
]

function App() {
  const [dark, setDark] = useState(false)

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            O
          </div>
          <span className="text-lg font-semibold">
            Obania <span className="text-primary">Metrics</span> App
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={toggle}>
          {dark ? '☀️ Claro' : '🌙 Escuro'}
        </Button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="text-xl font-semibold">Base moderna a funcionar ✅</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            React + Vite + Tailwind + shadcn/ui. As cores de estado das RNC e o
            modo claro/escuro já estão ligados aos <em>tokens</em> de design.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {STATUS.map((s) => (
              <span
                key={s.label}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${s.className}`}
              >
                {s.label}
              </span>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button>Ação principal</Button>
            <Button variant="secondary">Secundária</Button>
            <Button variant="outline">Contorno</Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
