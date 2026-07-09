import { useState } from 'react'
import { Info } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'

/**
 * Ícone "i" que revela uma explicação ao passar o cursor, ao clicar ou por teclado.
 * Abre também ao toque (tablet/telemóvel) — essencial no chão de fábrica.
 * Serve para que quem não conhece a fábrica perceba o significado de cada dado.
 */
export function InfoTip({ text, label = 'Mais informação' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-[240px] rounded-md bg-foreground px-3 py-1.5 text-center text-xs text-balance text-background shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {text}
          <PopoverPrimitive.Arrow className="fill-foreground" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
