const STORAGE_KEY = 'apex_snake_highscores'

export function useHighScore() {
  function getScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  function addScore(score) {
    const scores = getScores()
    scores.push(score)
    scores.sort((a, b) => b - a)
    const top4 = scores.slice(0, 4)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(top4)) } catch {}
    return top4
  }

  return { getScores, addScore }
}
