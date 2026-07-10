import { useCallback, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell, type ViewId } from '@/components/AppShell'
import { Dashboard } from '@/views/Dashboard'
import { Production } from '@/views/Production'
import { Structure } from '@/views/Structure'
import { Profiles, type ProfileTarget } from '@/views/Profiles'
import { Settings } from '@/views/Settings'
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

function App() {
  const [view, setView] = useState<ViewId>('dashboard')
  const [db, setDb] = useState<Db>(loadDb)
  const [assistantOn, setAssistantOn] = useState(() => loadPrefs().assistantEnabled)
  // Alvo aberto nas Fichas — vive aqui para o resto da app poder "saltar" para uma ficha.
  const [profileSel, setProfileSel] = useState<ProfileTarget>(null)

  // Grava no localStorage (com arquivo automático) e atualiza o ecrã.
  const updateDb = useCallback((next: Db) => {
    saveDb(next)
    setDb({ ...next })
  }, [])

  const setAssistant = useCallback((on: boolean) => {
    savePrefs({ assistantEnabled: on })
    setAssistantOn(on)
  }, [])

  // Navegação cruzada: abrir a ficha de uma máquina/equipa/trabalhador vindo de qualquer ecrã.
  const openProfile = useCallback((target: ProfileTarget) => {
    setProfileSel(target)
    setView('profiles')
  }, [])

  const navigate = useCallback((v: ViewId) => {
    // Entrar nas Fichas pelo menu mostra a lista (não uma ficha antiga).
    if (v === 'profiles') setProfileSel(null)
    setView(v)
  }, [])

  return (
    <TooltipProvider delayDuration={150}>
      <AppShell view={view} onNavigate={navigate}>
        {view === 'dashboard' && <Dashboard db={db} assistantOn={assistantOn} />}
        {view === 'production' && <Production db={db} assistantOn={assistantOn} />}
        {view === 'structure' && <Structure db={db} onChange={updateDb} onOpenProfile={openProfile} />}
        {view === 'profiles' && (
          <Profiles
            db={db}
            sel={profileSel}
            onSelChange={setProfileSel}
            onGoProduction={() => setView('production')}
            assistantOn={assistantOn}
          />
        )}
        {view === 'data' && <Placeholder label="Dados" />}
        {view === 'ai' && <Placeholder label="Assistente IA" />}
        {view === 'settings' && (
          <Settings db={db} onChange={updateDb} assistantOn={assistantOn} onAssistantChange={setAssistant} />
        )}
      </AppShell>
    </TooltipProvider>
  )
}

export default App
