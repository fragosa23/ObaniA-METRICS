import { Popover as PopoverPrimitive } from 'radix-ui'
import { Mascot } from '@/components/ObaniA'
import type { Insight } from '@/lib/insights'
import { toneVar } from '@/lib/severity'

/**
 * Ícone do ObaniA no canto de um gráfico: ao clicar, o assistente faz a
 * análise desse gráfico em concreto (com base apenas nos dados registados).
 */
export function ChartReview({ insights, label }: { insights: Insight[]; label: string }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Pedir ao ObaniA a análise de: ${label}`}
          title="Análise do ObaniA a este gráfico"
          className="omp-review-btn inline-flex shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
        >
          <Mascot size="xs" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="omp-panel-in z-50 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl"
        >
          <div className="flex items-center gap-2.5 border-b bg-muted/40 px-3.5 py-2.5">
            <Mascot size="sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm font-semibold">ObaniA</div>
              <div className="truncate text-[11px] text-muted-foreground">Análise: {label}</div>
            </div>
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto p-3">
            {insights.map((i) => (
              <div
                key={i.id}
                className="rounded-lg border bg-background/60 p-2.5 pl-3"
                style={{ borderLeft: `3px solid ${toneVar[i.tone]}` }}
              >
                <div className="text-[13px] font-semibold">{i.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{i.text}</p>
              </div>
            ))}
          </div>
          <div className="border-t px-3.5 py-2 text-[10px] text-muted-foreground">
            Baseado apenas nos dados registados — nunca invento valores.
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
