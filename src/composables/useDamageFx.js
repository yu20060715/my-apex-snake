export function useDamageFx() {
  const state = {
    flashAlpha: 0,
    shakeX: 0,
    shakeY: 0,
    particles: []
  }

  let flashTimer = 0
  let shakeTimer = 0

  function triggerHit() {
    flashTimer = 0.15
    shakeTimer = 0.08
  }

  function update(dt) {
    if (flashTimer > 0) {
      flashTimer -= dt
      state.flashAlpha = (flashTimer / 0.15) * 0.25
    } else {
      state.flashAlpha = 0
    }

    if (shakeTimer > 0) {
      shakeTimer -= dt
      const a = shakeTimer / 0.08
      state.shakeX = (Math.random() - 0.5) * 6 * a
      state.shakeY = (Math.random() - 0.5) * 6 * a
    } else {
      state.shakeX = 0
      state.shakeY = 0
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.97
      p.vy *= 0.97
      p.life -= dt
      if (p.life <= 0) state.particles.splice(i, 1)
    }
  }

  function spawnBlood(x, y, angle) {
    for (let i = 0; i < 15; i++) {
      const speed = 50 + Math.random() * 100
      const dir = angle + (Math.random() - 0.5) * Math.PI * 0.8
      const life = 0.4 + Math.random() * 0.3
      state.particles.push({
        x, y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 3,
        color: `hsl(0, ${80 + Math.random() * 20}%, ${40 + Math.random() * 30}%)`
      })
    }
  }

  function drawHitFx(ctx, cw, ch) {
    if (state.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,0,0,${state.flashAlpha})`
      ctx.fillRect(0, 0, cw, ch)
    }
  }

  function drawLowHpGlow(ctx, hp, maxHp, cw, ch, ts) {
    if (hp > 2) return
    const pulse = 0.25 + 0.15 * Math.sin(ts * 0.005)
    const intensity = 1 - hp / (maxHp * 0.5)
    const alpha = intensity * pulse
    ctx.strokeStyle = `rgba(255,0,0,${alpha})`
    ctx.lineWidth = 4
    ctx.shadowBlur = 20
    ctx.shadowColor = `rgba(255,0,0,${alpha * 0.6})`
    ctx.strokeRect(2, 2, cw - 4, ch - 4)
    ctx.shadowBlur = 0
  }

  function drawParticles(ctx) {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function reset() {
    flashTimer = 0
    shakeTimer = 0
    state.flashAlpha = 0
    state.shakeX = 0
    state.shakeY = 0
    state.particles.length = 0
  }

  return { state, triggerHit, update, spawnBlood, drawHitFx, drawLowHpGlow, drawParticles, reset }
}
