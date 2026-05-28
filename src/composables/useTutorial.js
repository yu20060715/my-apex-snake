const STORAGE_KEY = 'apex_snake_tutorial_done'

export function useTutorial() {
  function isDone() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  }

  function markDone() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
  }

  return { isDone, markDone }
}
