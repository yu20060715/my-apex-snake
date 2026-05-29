const CW = 960, CH = 720
const PICKUP_LIFETIME = 12
const SPAWN_INTERVAL = 15
const SPEED = 60

export function useHealthPickup() {
  const pickup = { x: 0, y: 0, vx: 0, vy: 0, lifetime: 0, active: false, nextTurn: 0 }
  let spawnTimer = 0
  let firstSpawn = true

  function update(dt, snake) {
    if (!pickup.active) return

    pickup.lifetime -= dt
    if (pickup.lifetime <= 0) {
      pickup.active = false
      return
    }

    const head = snake[0]

    let fx = 0, fy = 0
    if (head) {
      const tx = head.x - pickup.x
      const ty = head.y - pickup.y
      const td = Math.hypot(tx, ty) || 1
      fx = -tx / td
      fy = -ty / td
    }

    const margin = 65
    let wx = 0, wy = 0
    if (pickup.x < margin) wx = 1 - pickup.x / margin
    if (pickup.x > CW - margin) wx = -(pickup.x - (CW - margin)) / margin
    if (pickup.y < margin) wy = 1 - pickup.y / margin
    if (pickup.y > CH - margin) wy = -(pickup.y - (CH - margin)) / margin
    const wd = Math.hypot(wx, wy) || 1
    wx /= wd; wy /= wd

    pickup.nextTurn -= dt
    let rx = 0, ry = 0
    if (pickup.nextTurn <= 0) {
      const ra = Math.random() * Math.PI * 2
      rx = Math.cos(ra)
      ry = Math.sin(ra)
      pickup.nextTurn = 1.5 + Math.random() * 1.5
    } else {
      const ra = Math.atan2(pickup.vy, pickup.vx) + (Math.random() - 0.5) * 0.6
      rx = Math.cos(ra)
      ry = Math.sin(ra)
    }

    const SZ = 40, spikeMargin = 20
    let spx = 0, spy = 0
    const inSpike = (pickup.x < SZ + spikeMargin && pickup.y < SZ + spikeMargin) ||
      (pickup.x > CW - SZ - spikeMargin && pickup.y < SZ + spikeMargin) ||
      (pickup.x < SZ + spikeMargin && pickup.y > CH - SZ - spikeMargin) ||
      (pickup.x > CW - SZ - spikeMargin && pickup.y > CH - SZ - spikeMargin)
    if (inSpike) {
      const scx = pickup.x < CW / 2 ? SZ / 2 : CW - SZ / 2
      const scy = pickup.y < CH / 2 ? SZ / 2 : CH - SZ / 2
      const sdx = pickup.x - scx || 1
      const sdy = pickup.y - scy || 1
      const sdd = Math.hypot(sdx, sdy) || 1
      spx = sdx / sdd
      spy = sdy / sdd
    }

    const wallDist = Math.min(pickup.x, CW - pickup.x, pickup.y, CH - pickup.y)
    const wallFactor = Math.max(0, 1 - wallDist / margin)
    const fleeW = 0.55 * (1 - wallFactor * 0.65)
    const wallW = 0.25 + wallFactor * 0.55
    const wanderW = 0.20
    const spikeW = inSpike ? 2.5 : 0

    pickup.vx = fx * fleeW + wx * wallW + rx * wanderW + spx * spikeW
    pickup.vy = fy * fleeW + wy * wallW + ry * wanderW + spy * spikeW
    const dm = Math.hypot(pickup.vx, pickup.vy) || 1
    pickup.vx /= dm
    pickup.vy /= dm

    pickup.x += pickup.vx * SPEED * dt
    pickup.y += pickup.vy * SPEED * dt
    pickup.x = Math.max(2, Math.min(CW - 2, pickup.x))
    pickup.y = Math.max(2, Math.min(CH - 2, pickup.y))
  }

  function trySpawn(dt, snake, hp, maxHp) {
    if (pickup.active) return
    if (hp >= maxHp) return

    spawnTimer -= dt
    if (spawnTimer > 0) return

    for (let i = 0; i < 50; i++) {
      const x = 40 + Math.random() * 720
      const y = 40 + Math.random() * 520
      const close = snake.some(s => Math.hypot(s.x - x, s.y - y) < 60)
      if (!close) {
        pickup.x = x
        pickup.y = y
        const a = Math.random() * Math.PI * 2
        pickup.vx = Math.cos(a)
        pickup.vy = Math.sin(a)
        pickup.lifetime = PICKUP_LIFETIME
        pickup.nextTurn = 2 + Math.random() * 2
        pickup.active = true
        return
      }
    }
  }

  function checkPickup(snake) {
    if (!pickup.active) return false
    for (const seg of snake) {
      if (Math.hypot(seg.x - pickup.x, seg.y - pickup.y) < 20) {
        pickup.active = false
        return true
      }
    }
    return false
  }

  function draw(ctx, ts) {
    if (!pickup.active) return
    const ratio = pickup.lifetime / PICKUP_LIFETIME
    const alpha = Math.min(1, ratio * 2.5)
    if (alpha <= 0) return

    const pulse = 1 + 0.15 * Math.sin(ts * 0.007)
    ctx.globalAlpha = alpha
    ctx.shadowBlur = 25
    ctx.shadowColor = `rgba(0,255,100,${alpha * 0.6})`

    const r = 10 * pulse
    ctx.fillStyle = '#0f6'
    const cx = pickup.x, cy = pickup.y
    ctx.fillRect(cx - 3, cy - r, 6, r * 2)
    ctx.fillRect(cx - r, cy - 3, r * 2, 6)

    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('+1', cx, cy - 1)
    ctx.globalAlpha = 1
  }

  function reset() {
    pickup.active = false
    spawnTimer = 10
    firstSpawn = true
  }

  return { pickup, update, trySpawn, checkPickup, draw, reset }
}
