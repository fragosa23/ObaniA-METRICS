import { useState } from 'react'
import { Clock, Plus, Target, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { InfoTip } from '@/components/InfoTip'
import type { Db } from '@/lib/types'
import { defaultSettings } from '@/lib/db'

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

/** Mascote pequena para a secção do assistente. */
function MiniMascot() {
  return (
    <span className="omp-mascot relative flex size-9 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white">
      O
      <span className="omp-mascot-eyes absolute inset-0 flex items-center justify-center gap-[22%]">
        <span className="omp-eye" />
        <span className="omp-eye" />
      </span>
    </span>
  )
}

export function Settings({
  db,
  onChange,
  assistantOn,
  onAssistantChange,
}: {
  db: Db
  onChange: (db: Db) => void
  assistantOn: boolean
  onAssistantChange: (on: boolean) => void
}) {
  const settings = db.settings ?? defaultSettings()
  const [newSchedule, setNewSchedule] = useState('')

  const mutate = (fn: (d: Db) => void) => {
    const next = clone(db)
    next.settings = next.settings ?? defaultSettings()
    fn(next)
    onChange(next)
  }

  const addSchedule = () => {
    const v = newSchedule.trim()
    if (!v || settings.schedules.includes(v)) return
    mutate((d) => {
      d.settings!.schedules.push(v)
    })
    setNewSchedule('')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Preferências da app. As metas e os horários viajam com a exportação de dados; o assistente é
          uma preferência deste dispositivo.
        </p>
      </div>

      {/* Assistente ObaniA */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 px-6 py-5">
          <MiniMascot />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-semibold">
              Assistente ObaniA
              <InfoTip text="O balão de sugestões que aparece no Dashboard. Comenta o período selecionado com base apenas nos dados registados — nunca inventa valores." />
            </div>
            <p className="text-sm text-muted-foreground">
              {assistantOn
                ? 'Ligado — mostra sugestões no Dashboard sobre o período que estás a ver.'
                : 'Desligado — não mostra sugestões. Liga para voltar a ver o balão no Dashboard.'}
            </p>
          </div>
          <Switch
            checked={assistantOn}
            onCheckedChange={onAssistantChange}
            aria-label="Ligar ou desligar o assistente ObaniA"
          />
        </CardContent>
      </Card>

      {/* Meta da taxa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4.5 text-muted-foreground" />
            Meta da taxa de RNC
            <InfoTip text="O valor que consideras aceitável para a taxa RNC/100 OF. Aparece no Dashboard junto à taxa e o assistente usa-a para avisar quando uma máquina está acima." />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Taxa RNC/100 OF até</span>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={settings.targetTaxa}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!Number.isNaN(v) && v >= 0 && v <= 100) {
                mutate((d) => {
                  d.settings!.targetTaxa = v
                })
              }
            }}
            className="w-24"
            aria-label="Meta da taxa de RNC por 100 OF"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </CardContent>
      </Card>

      {/* Horários e Turnos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4.5 text-muted-foreground" />
            Horários e Turnos
            <InfoTip text="Os horários disponíveis ao criar/editar equipas de turno fixo. Os turnos em si (Manhã, Tarde, Noite) são fixos na app." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {settings.schedules.map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm tabular-nums">{s}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover o horário ${s}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    mutate((d) => {
                      d.settings!.schedules = d.settings!.schedules.filter((x) => x !== s)
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {settings.schedules.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sem horários definidos — acrescenta pelo menos um para as equipas de turno fixo.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newSchedule}
              onChange={(e) => setNewSchedule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSchedule()}
              placeholder="Ex.: 08:00–16:00"
              aria-label="Novo horário"
            />
            <Button onClick={addSchedule} disabled={!newSchedule.trim()}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
