const CW = 960, CH = 720

export const GHOST_TYPES = {
  WANDERER: 'wanderer',
  CHASER: 'chaser',
  AMBUSHER: 'ambusher'
}

function createGhost(type) {
  const a = Math.random() * Math.PI * 2
  return {
    type,
    x: 80 + Math.random() * 640,
    y: 80 + Math.random() * 440,
    vx: Math.cos(a),
    vy: Math.sin(a),
    phase: Math.random() * Math.PI * 2,
    nextTurn: 2 + Math.random() * 2,
    stunned: 0
  }
}

function bounce(g) {
  if (g.x < 0) { g.x = 0; g.vx = -g.vx }
  if (g.x > CW) { g.x = CW; g.vx = -g.vx }
  if (g.y < 0) { g.y = 0; g.vy = -g.vy }
  if (g.y > CH) { g.y = CH; g.vy = -g.vy }
}

function resetGhost(g) {
  const a = Math.random() * Math.PI * 2
  g.x = 80 + Math.random() * 640
  g.y = 80 + Math.random() * 440
  g.vx = Math.cos(a)
  g.vy = Math.sin(a)
  g.stunned = 0
}

function knockback(g, h) {
  const dx = g.x - h.x || 1
  const dy = g.y - h.y || 1
  const dd = Math.hypot(dx, dy) || 1
  g.vx = dx / dd
  g.vy = dy / dd
  g.x += g.vx * 20
  g.y += g.vy * 20
}

export function useGhosts() {
  const ghosts = []

  function initGhosts() {
    ghosts.length = 0
    ghosts.push(createGhost(GHOST_TYPES.WANDERER))
    ghosts.push(createGhost(GHOST_TYPES.CHASER))
    ghosts.push(createGhost(GHOST_TYPES.AMBUSHER))
  }

  function updateGhosts(dt, snake, speed) {
    const baseSpeed = Math.max(1, speed + 1)
    const head = snake[0]

    for (let i = 0; i < ghosts.length; i++) {
      for (let j = i + 1; j < ghosts.length; j++) {
        const a = ghosts[i], b = ghosts[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.hypot(dx, dy)
        if (dist < 30 && dist > 0) {
          const push = (30 - dist) / 30 * 0.8
          const nx = dx / dist, ny = dy / dist
          a.x += nx * push
          a.y += ny * push
          b.x -= nx * push
          b.y -= ny * push
        }
      }
    }

    for (const g of ghosts) {
      if (g.stunned > 0) {
        g.stunned -= dt
        const s = baseSpeed * 0.3
        g.x += g.vx * s * 60 * dt
        g.y += g.vy * s * 60 * dt
        bounce(g)
        continue
      }

      g.nextTurn -= dt
      if (g.nextTurn <= 0) {
        updateAI(g, head, snake)
        g.nextTurn = 1.5 + Math.random() * 2.5
      }

      const ms = getSpeed(g, baseSpeed)
      g.x += g.vx * ms * 60 * dt
      g.y += g.vy * ms * 60 * dt
      bounce(g)
    }
  }

  function updateAI(g, head, snake) {
    if (g.type === GHOST_TYPES.CHASER) {
      if (head) {
        const tx = head.x - g.x
        const ty = head.y - g.y
        const td = Math.hypot(tx, ty) || 1
        g.vx = tx / td
        g.vy = ty / td
      }
    } else if (g.type === GHOST_TYPES.AMBUSHER) {
      if (head && snake.length >= 2) {
        const dx = snake[0].x - snake[1].x
        const dy = snake[0].y - snake[1].y
        const dd = Math.hypot(dx, dy) || 1
        const lookAhead = 120
        const tx = (head.x + dx / dd * lookAhead) - g.x
        const ty = (head.y + dy / dd * lookAhead) - g.y
        const td = Math.hypot(tx, ty) || 1
        g.vx = tx / td
        g.vy = ty / td
      }
    } else {
      if (head && Math.random() < 0.35) {
        const tx = head.x - g.x
        const ty = head.y - g.y
        const td = Math.hypot(tx, ty) || 1
        g.vx = tx / td
        g.vy = ty / td
      } else {
        const ra = Math.random() * Math.PI * 2
        g.vx = g.vx * 0.7 + Math.cos(ra) * 0.3
        g.vy = g.vy * 0.7 + Math.sin(ra) * 0.3
        const dm = Math.hypot(g.vx, g.vy) || 1
        g.vx /= dm; g.vy /= dm
      }
    }
  }

  function getSpeed(g, base) {
    if (g.type === GHOST_TYPES.CHASER) return base * 0.85
    if (g.type === GHOST_TYPES.AMBUSHER) return base * 0.65
    return base
  }

  function checkGhosts(snake, shielded) {
    const h = snake[0]
    if (!h) return null
    let shieldHit = false
    for (const g of ghosts) {
      if (Math.hypot(h.x - g.x, h.y - g.y) < 20) {
        if (shielded) {
          knockback(g, h)
          if (g.type === GHOST_TYPES.CHASER) g.stunned = 1.5
          shieldHit = true
        } else {
          resetGhost(g)
          return 'hit'
        }
      }
    }
    return shieldHit ? 'shieldBounce' : null
  }

  function manageGhostCount(score) {
    const target = Math.min(8, 3 + Math.floor(score / 50))
    while (ghosts.length < target) {
      const types = [GHOST_TYPES.WANDERER, GHOST_TYPES.CHASER, GHOST_TYPES.AMBUSHER]
      ghosts.push(createGhost(types[ghosts.length % types.length]))
    }
  }

  function drawGhosts(ctx, ts) {
    for (const g of ghosts) {
      const pulse = 0.6 + 0.4 * Math.sin(ts * 0.004 + g.phase)
      ctx.save()
      ctx.translate(g.x, g.y)

      if (g.type === GHOST_TYPES.CHASER) {
        drawChaser(ctx, pulse, g.stunned > 0)
      } else if (g.type === GHOST_TYPES.AMBUSHER) {
        drawAmbusher(ctx, pulse)
      } else {
        drawWanderer(ctx, pulse)
      }

      ctx.restore()
    }
  }

  function drawWanderer(ctx, pulse) {
    const a = 0.55 * pulse
    ctx.globalAlpha = a
    ctx.shadowBlur = 22
    ctx.shadowColor = 'rgba(180,200,255,0.7)'
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2)
    ctx.fillStyle = '#cce'
    ctx.fill()
    ctx.shadowBlur = 14
    ctx.shadowColor = 'rgba(180,200,255,0.4)'
    ctx.beginPath(); ctx.arc(-3, -4, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#dde'; ctx.fill()
    ctx.beginPath(); ctx.arc(3, -4, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1; ctx.shadowBlur = 0
  }

  function drawChaser(ctx, pulse, stunned) {
    const a = stunned ? 0.35 * pulse : 0.55 * pulse
    ctx.globalAlpha = a
    ctx.shadowBlur = 22
    ctx.shadowColor = stunned ? 'rgba(120,80,80,0.5)' : 'rgba(255,80,80,0.7)'
    ctx.beginPath()
    ctx.moveTo(15, 0)
    ctx.lineTo(-10, -12)
    ctx.lineTo(-10, 12)
    ctx.closePath()
    ctx.fillStyle = stunned ? '#866' : '#f44'
    ctx.fill()
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
  }

  function drawAmbusher(ctx, pulse) {
    ctx.globalAlpha = 0.55 * pulse
    ctx.shadowBlur = 22
    ctx.shadowColor = 'rgba(180,80,255,0.7)'
    ctx.beginPath()
    ctx.moveTo(0, -14)
    ctx.lineTo(12, 0)
    ctx.lineTo(0, 14)
    ctx.lineTo(-12, 0)
    ctx.closePath()
    ctx.fillStyle = '#c6f'
    ctx.fill()
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
  }

  return { ghosts, initGhosts, updateGhosts, checkGhosts, manageGhostCount, drawGhosts, GHOST_TYPES }
}
