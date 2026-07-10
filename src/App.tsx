import { useCallback, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell, type ViewId } from '@/components/AppShell'
import { Dashboard } from '@/views/Dashboard'
import { Production } from '@/views/Production'
import { Structure } from '@/views/Structure'
import { Profiles, type ProfileTarget } from '@/views/Profiles'
import { Settings } from '@/views/Settings'
import { Data, type EditTarget } from '@/views/Data'
import { loadDb, saveDb } from '@/lib/db'
import { loadPrefs, savePrefs } from '@/lib/prefs'
import type { Db } from '@/lib/types'

function Placeholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center text-card-foreground">
      <h1 className="text-xl font-semibold">{label}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Este ecrã está a ser reconstruído na nova versão. Chega em breve.
      </p>
    </div>
  )
}

/** Um passo de navegação (para o botão Voltar percorrer o caminho todo para trás). */
interface NavState {
  view: ViewId
  profile: ProfileTarget
}

function App() {
  const [view, setView] = useState<ViewId>('dashboard')
  const [db, setDb] = useState<Db>(loadDb)
  const [assistantOn, setAssistantOn] = useState(() => loadPrefs().assistantEnabled)
  // Alvo aberto nas Fichas — vive aqui para o resto da app poder "saltar" para uma ficha.
  const [profileSel, setProfileSel] = useState<ProfileTarget>(null)
  // Pedido de edição pendente para o ecrã Dados (vindo do botão "Editar" de uma ficha).
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  // Histórico de navegação: cada salto empilha o sítio onde estávamos.
  const [history, setHistory] = useState<NavState[]>([])

  // Grava no localStorage (com arquivo automático) e atualiza o ecrã.
  const updateDb = useCallback((next: Db) => {
    saveDb(next)
    setDb({ ...next })
  }, [])

  const setAssistant = useCallback((on: boolean) => {
    savePrefs({ assistantEnabled: on })
    setAssistantOn(on)
  }, [])

  // Navegar guardando o sítio atual no histórico (máx. 30 passos).
  const go = useCallback(
    (v: ViewId, profile: ProfileTarget = null) => {
      setHistory((h) => [...h.slice(-29), { view, profile: profileSel }])
      setView(v)
      setProfileSel(profile)
    },
    [view, profileSel],
  )

  const goBack = useCallback(() => {
    setHistory((h) => {
      const prev = h[h.length - 1]
      if (!prev) return h
      setView(prev.view)
      setProfileSel(prev.profile)
      return h.slice(0, -1)
    })
  }, [])

  // Abrir a ficha de uma máquina/equipa/trabalhador vindo de qualquer ecrã.
  const openProfile = useCallback((target: ProfileTarget) => go('profiles', target), [go])

  // Abrir a edição de uma entidade no ecrã Dados (toda a edição acontece lá).
  const openEditor = useCallback(
    (target: EditTarget) => {
      setEditTarget(target)
      go('data')
    },
    [go],
  )

  return (
    <TooltipProvider delayDuration={150}>
      <AppShell view={view} onNavigate={(v) => go(v)} onBack={history.length ? goBack : null}>
        {view === 'dashboard' && <Dashboard db={db} assistantOn={assistantOn} />}
        {view === 'production' && <Production db={db} assistantOn={assistantOn} />}
        {view === 'structure' && (
          <Structure db={db} onOpenProfile={openProfile} onOpenEditor={openEditor} />
        )}
        {view === 'profiles' && (
          <Profiles
            db={db}
            sel={profileSel}
            onSelChange={(t) => go('profiles', t)}
            onGoProduction={() => go('production')}
            onEdit={(t) => openEditor({ kind: t.kind, id: t.id })}
            assistantOn={assistantOn}
          />
        )}
        {view === 'data' && (
          <Data
            db={db}
            onChange={updateDb}
            onReload={() => setDb(loadDb())}
            editTarget={editTarget}
            onConsumeEdit={() => setEditTarget(null)}
          />
        )}
        {view === 'ai' && <Placeholder label="Assistente IA" />}
        {view === 'settings' && (
          <Settings db={db} onChange={updateDb} assistantOn={assistantOn} onAssistantChange={setAssistant} />
        )}
      </AppShell>
    </TooltipProvider>
  )
}

export default App
