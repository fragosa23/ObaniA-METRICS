import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Insight } from '@/lib/insights'
import { toneVar } from '@/lib/severity'

/** Mascote do assistente: o "O" da ObaniA com olhos que piscam. */
function Mascot({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const cls = size === 'md' ? 'size-11 rounded-2xl text-xl' : 'size-8 rounded-xl text-sm'
  return (
    <span
      className={`omp-mascot relative flex shrink-0 items-center justify-center font-bold text-white ${cls}`}
      aria-hidden="true"
    >
      O
      <span className="omp-mascot-eyes absolute inset-0 flex items-center justify-center gap-[22%]">
        <span className="omp-eye" />
        <span className="omp-eye" />
      </span>
    </span>
  )
}

/**
 * Assistente ObaniA — balão de sugestões contextuais (estilo "Clippy", mas educado):
 * comenta o que está no ecrã, nunca bloqueia nada, e pode ser fechado
 * (religa-se no menu Configurações).
 */
export function ObaniA({
  insights,
  enabled,
  onDisable,
}: {
  insights: Insight[]
  enabled: boolean
  onDisable: () => void
}) {
  // Em ecrãs pequenos começa recolhido (só o pontinho avisa) — para nunca tapar o conteúdo.
  const isWide = () => window.matchMedia('(min-width: 640px)').matches
  const [open, setOpen] = useState(isWide)
  const [confirmClose, setConfirmClose] = useState(false)

  // Assinatura do conjunto de sugestões: quando muda (novo período), reabre o balão (em ecrã largo).
  const signature = useMemo(() => insights.map((i) => i.id).join('|'), [insights])
  useEffect(() => {
    if (insights.length && isWide()) setOpen(true)
  }, [signature, insights.length])

  if (!enabled || insights.length === 0) return null

  return (
    <>
      {/* Botão flutuante (sempre presente enquanto o assistente está ligado) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Esconder as sugestões do assistente' : 'Mostrar as sugestões do assistente'}
        className="omp-assistant-btn fixed right-4 bottom-4 z-40 flex items-center justify-center rounded-2xl shadow-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
      >
        <Mascot />
        {!open && <span className="omp-assistant-dot" aria-hidden="true" />}
      </button>

      {/* Balão de sugestões */}
      {open && (
        <div
          role="complementary"
          aria-label="Sugestões do assistente ObaniA"
          className="omp-panel-in fixed right-4 bottom-20 z-40 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl"
        >
          <div className="flex items-center gap-2.5 border-b bg-muted/40 px-3.5 py-2.5">
            <Mascot size="sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm font-semibold">ObaniA</div>
              <div className="text-[11px] text-muted-foreground">
                Sugestões sobre o período que estás a ver
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar o assistente"
              onClick={() => setConfirmClose(true)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto p-3">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="rounded-lg border bg-background/60 p-2.5 pl-3"
                style={{ borderLeft: `3px solid ${toneVar[ins.tone]}` }}
              >
                <div className="text-[13px] font-semibold">{ins.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ins.text}</p>
              </div>
            ))}
          </div>

          <div className="border-t px-3.5 py-2 text-[10px] text-muted-foreground">
            Baseado apenas nos dados registados — nunca invento valores.
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClose}
        title="Fechar o assistente ObaniA?"
        description="Deixa de mostrar sugestões. Pode ser ligado de novo no menu Configurações."
        confirmLabel="Fechar assistente"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false)
          onDisable()
        }}
      />
    </>
  )
}
