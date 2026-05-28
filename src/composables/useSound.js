let audioCtx = null

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function tone(freq, duration, type = 'square', volume = 0.12, delay = 0) {
  const ctx = getCtx()
  if (ctx.state === 'suspended') return
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration)
}

function noise(duration, volume = 0.1, delay = 0) {
  const ctx = getCtx()
  if (ctx.state === 'suspended') return
  const t = ctx.currentTime + delay
  const sr = ctx.sampleRate
  const len = sr * duration
  const buf = ctx.createBuffer(1, len, sr)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, t)
  src.connect(gain).connect(ctx.destination)
  src.start(t)
}

export function useSound() {
  function initSound() {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
  }

  function playEat() {
    tone(880, 0.08, 'square', 0.1)
    tone(1320, 0.1, 'square', 0.07, 0.05)
  }

  function playGhostHit() {
    tone(150, 0.2, 'sawtooth', 0.12)
  }

  function playShieldBounce() {
    tone(660, 0.08, 'triangle', 0.1)
    tone(880, 0.06, 'triangle', 0.07, 0.06)
  }

  function playPickupShield() {
    tone(440, 0.1, 'square', 0.1)
    tone(660, 0.1, 'square', 0.08, 0.08)
    tone(880, 0.12, 'square', 0.06, 0.16)
  }

  function playSpikeHit() {
    tone(80, 0.15, 'sawtooth', 0.15)
    noise(0.15, 0.08)
  }

  function playDeath() {
    tone(440, 0.2, 'square', 0.12)
    tone(330, 0.2, 'square', 0.1, 0.15)
    tone(220, 0.3, 'square', 0.08, 0.3)
    tone(110, 0.4, 'sawtooth', 0.06, 0.45)
  }

  function playMilestone() {
    tone(523, 0.08, 'square', 0.08)
    tone(659, 0.08, 'square', 0.08, 0.08)
    tone(784, 0.08, 'square', 0.08, 0.16)
    tone(1047, 0.12, 'square', 0.06, 0.24)
  }

  function playPickupHealth() {
    tone(660, 0.1, 'triangle', 0.1)
    tone(880, 0.12, 'triangle', 0.08, 0.08)
  }

  return { initSound, playEat, playGhostHit, playShieldBounce, playPickupShield, playSpikeHit, playDeath, playMilestone, playPickupHealth }
}
