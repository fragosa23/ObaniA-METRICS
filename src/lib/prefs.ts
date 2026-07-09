// Preferências de interface deste dispositivo (não viajam com a exportação de dados).

const KEY = 'omp_ui_prefs'

export interface UiPrefs {
  /** Assistente ObaniA visível? Desligável na cruz do balão; religável em Configurações. */
  assistantEnabled: boolean
}

const DEFAULTS: UiPrefs = { assistantEnabled: true }

export function loadPrefs(): UiPrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(prefs: UiPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
