import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  LayoutDashboard,
  Factory,
  Boxes,
  IdCard,
  Database,
  Bot,
  Menu,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export type ViewId =
  | 'dashboard'
  | 'production'
  | 'structure'
  | 'profiles'
  | 'data'
  | 'ai'
  | 'settings'

export const VIEWS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'production', label: 'Produção', icon: Factory },
  { id: 'structure', label: 'Estrutura', icon: Boxes },
  { id: 'profiles', label: 'Fichas', icon: IdCard },
  { id: 'data', label: 'Dados', icon: Database },
  { id: 'ai', label: 'Assistente IA', icon: Bot },
  { id: 'settings', label: 'Configurações', icon: Settings },
]

export function AppShell({
  view,
  onNavigate,
  onBack,
  children,
}: {
  view: ViewId
  onNavigate: (v: ViewId) => void
  /** Voltar um passo na navegação; null = sem histórico (botão escondido). */
  onBack?: (() => void) | null
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const current = VIEWS.find((v) => v.id === view)

  const go = (v: ViewId) => {
    onNavigate(v)
    setOpen(false)
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                  O
                </span>
                Obania <span className="text-primary">Metrics</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {VIEWS.map((v) => {
                const Icon = v.icon
                const active = v.id === view
                return (
                  <button
                    key={v.id}
                    onClick={() => go(v.id)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="size-4.5" />
                    {v.label}
                  </button>
                )
              })}
            </nav>
            <div className="mt-auto border-t p-3">
              <p className="text-xs text-muted-foreground">Dados locais no dispositivo · v3</p>
            </div>
          </SheetContent>
        </Sheet>

        {onBack && (
          <Button variant="ghost" size="icon" aria-label="Voltar ao ecrã anterior" title="Voltar" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            O
          </span>
          <span className="font-semibold">
            Obania <span className="text-primary">Metrics</span> App
          </span>
        </div>

        <span className="ml-auto text-sm text-muted-foreground">{current?.label}</span>
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  )
}
