<template>
  <div class="app-shell">
    <div class="game-row">
      <div class="side-panel">
        <div class="sp-hp">
          <div v-for="row in 2" :key="row" class="hp-row">
            <span v-for="col in 3" :key="col" class="hp-heart">{{ (row - 1) * 3 + col <= hp ? '❤️' : '🖤' }}</span>
          </div>
        </div>
        <div class="sp-stat">
          <span class="sp-label">{{ lang('score') }}</span>
          <span class="sp-value">{{ score }}</span>
        </div>
        <div class="sp-stat">
          <span class="sp-label">{{ lang('speed') }}</span>
          <span class="sp-value">{{ speed.toFixed(1) }}</span>
        </div>
        <div class="sp-stat">
          <span class="sp-label">{{ lang('ghosts') }}</span>
          <span class="sp-value">{{ ghostLabel() }}</span>
        </div>
        <div class="sp-stat">
          <span class="sp-label">{{ lang('kills') }}</span>
          <span class="sp-value">{{ kills }}</span>
        </div>
        <div class="sp-stat" v-if="bestScore > 0">
          <span class="sp-label">{{ lang('best') }}</span>
          <span class="sp-value sp-best">{{ bestScore }}</span>
        </div>
        <div class="sp-divider"></div>
        <div class="sp-section-title">{{ lang('leaderboard') }}</div>
        <div v-for="(entry, i) in leaderboard" :key="i" class="sp-lb-row">
          <span class="sp-lb-rank">{{ rankIcon(i) }}</span>
          <span class="sp-lb-score">{{ entry }}</span>
        </div>
        <div v-if="leaderboard.length === 0" class="sp-empty">{{ lang('noScores') }}</div>
      </div>

      <div class="game-column">
        <div class="game-wrapper">
          <div class="canvas-wrap">
            <canvas ref="gameCanvas" width="960" height="720"></canvas>

            <div v-if="gameState === 'menu'" class="overlay">
              <button class="btn-lang" @click="toggleLang">
                {{ currentLang === 'zh' ? 'English' : '中文' }}
              </button>
              <h1>{{ lang('title') }}</h1>
              <div class="rules-list">
                <p v-for="(r, i) in lang('rules')" :key="i" class="rule-line">{{ r }}</p>
              </div>
              <div class="mode-select">
                <button :class="['mode-btn', { active: controlMode === 'wasd' }]"
                        @click="controlMode = 'wasd'">{{ lang('wasdMode') }}</button>
                <button :class="['mode-btn', { active: controlMode === 'joystick' }]"
                        @click="controlMode = 'joystick'">{{ lang('joyMode') }}</button>
              </div>
              <button class="btn btn-start" @click="startGame">{{ lang('start') }}</button>
              <button class="btn-help" @click="openTutorial">?</button>
            </div>

            <div v-if="showTutorial" class="overlay tutorial-overlay" @click.self="closeTutorial">
              <h2>{{ lang('tutorial')[tutorialPage].title }}</h2>
              <p class="tutorial-text" v-html="lang('tutorial')[tutorialPage].text"></p>
              <div class="tutorial-nav">
                <button v-if="tutorialPage > 0" class="btn-nav" @click="tutorialPage--">{{ lang('prev') }}</button>
                <div class="tutorial-dots">
                  <span v-for="(p, i) in lang('tutorial')" :key="i"
                        :class="['dot', { active: i === tutorialPage }]"></span>
                </div>
                <button v-if="tutorialPage < lang('tutorial').length - 1" class="btn-nav" @click="tutorialPage++">{{ lang('next') }}</button>
                <button v-else class="btn-nav btn-nav-primary" @click="closeTutorial">{{ lang('gotIt') }}</button>
                <button class="btn-nav btn-nav-skip" @click="skipTutorial">{{ lang('skip') }}</button>
              </div>
            </div>

            <div v-if="gameState === 'gameover'" class="overlay">
              <h1>{{ lang('gameover') }}</h1>
              <div class="final-score">{{ lang('score') }}：{{ score }}</div>
              <div class="mode-select">
                <button :class="['mode-btn', { active: controlMode === 'wasd' }]"
                        @click="controlMode = 'wasd'">{{ lang('wasdMode') }}</button>
                <button :class="['mode-btn', { active: controlMode === 'joystick' }]"
                        @click="controlMode = 'joystick'">{{ lang('joyMode') }}</button>
              </div>
              <button class="btn btn-start" @click="startGame">{{ lang('restart') }}</button>
            </div>

          </div>

          <div class="joy-section">
            <div id="joystick-zone" :class="['joystick-ctrl', { disabled: controlMode === 'wasd' }]"></div>
          </div>
        </div>
        </div>
    </div>
  </div>
</template>

<script>
import { useSound } from './composables/useSound.js'
import { useGhosts } from './composables/useGhosts.js'
import { useDamageFx } from './composables/useDamageFx.js'
import { useHealthPickup } from './composables/useHealthPickup.js'
import { useTutorial } from './composables/useTutorial.js'
import { useHighScore } from './composables/useHighScore.js'

const CW = 960, CH = 720

const WASD_MAP = {
  w: 'w', W: 'w', a: 'a', A: 'a', s: 's', S: 's', d: 'd', D: 'd',
  ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd'
}

export default {
  name: 'App',

  data() {
    return {
      gameState: 'menu',
      currentLang: 'zh',
      score: 0,
      speed: 3,
      maxSpeed: 5,
      hp: 6,
      maxHp: 6,
      controlMode: 'wasd',
      snake: [],
      foods: [],
      joystickAngle: 0,
      deathIndex: 0,
      kills: 0,
      shieldActive: false,
      shieldEndTime: 0,
      shieldPickup: null,
      shieldSpawnTimer: 0,
      spikeCooldown: 0,
      showTutorial: false,
      tutorialPage: 0,
      leaderboard: []
    }
  },

  computed: {
    bestScore() {
      return this.leaderboard.length > 0 ? this.leaderboard[0] : 0
    }
  },

  created() {
    this.baseSpeed = 3
    this.segmentSpacing = 14
    this.sound = useSound()
    this.ghostsManager = useGhosts()
    this.damageFx = useDamageFx()
    this.healthPickup = useHealthPickup()
    this._tutorial = useTutorial()
    this._highScore = useHighScore()
    this.leaderboard = this._highScore.getScores()
    this._lastMilestone = 0
    this._pendingStart = false
    this._wasdKeys = { w: false, a: false, s: false, d: false }
    this.lastFrameTime = 0
    this.animId = null
    this.canvas = null
    this.ctx = null
    this.joystickActive = false
    this.joystickDir = null
    this.nippleInstance = null
    this.initialSnakeLen = 5
    this.renderPending = false
  },

  methods: {
    lang(key) {
      const dict = {
        zh: {
          title: 'APEX 蛇',
          rules: [
            '❤️ 血量：左上角愛心，共 6 顆，被幽靈撞到會扣血',
            '🍎 食物：金色光球，+10 分、加速、蛇身變長',
            '👻 幽靈：藍圓巡邏、紅三角追擊、紫菱預判，撞到扣 1 HP',
            '🛡️ 護盾：藍色道具，彈開幽靈一次，持續 5 秒',
            '💚 補血：綠色十字，會逃跑，+1 HP',
            '⚡ 尖刺：四角陷阱，-15 分、截尾 3 節',
            '↔️ 邊界反彈：所有角色碰到邊界都會反彈',
            '🔊 請開啟聲音！本遊戲有完整音效'
          ],
          start: '開始遊戲',
          gameover: '遊戲結束',
          restart: '重新開始',
          score: '分數',
          speed: '速度',
          ghosts: '幽靈',
          kills: '反彈',
          best: '最佳',
          wasdMode: 'WASD 模式',
          joyMode: '搖桿模式',
          prev: '上頁',
          next: '下頁',
          skip: '跳過引導',
          gotIt: '知道了',
          leaderboard: '排行榜',
          noScores: '尚無紀錄',
          tutorial: [
            { title: '🎮 操作與血量', text: '使用 <b>WASD</b>（支援斜向）或右下角<b>搖桿</b>控制蛇的移動。<br><br>左上角 <b>❤️ 愛心</b>是血量，共 6 顆。被幽靈撞到會扣 1 HP，歸零即死亡。' },
            { title: '🍎 食物與分數', text:  '吃掉金色光球可獲得 <b>+10 分</b>，蛇身會變長、速度上升。<br><br>每 <b>100 分</b>會有里程碑音效提醒。<br>分數越高，幽靈數量會增加（每 50 分多 1 隻），上限 8 隻。' },
            { title: '👻 幽靈與護盾', text: '三種幽靈：<br>🟦 藍圓 <b>Wanderer</b> — 隨機巡邏<br>🟥 紅三角 <b>Chaser</b> — 追擊你，被護盾彈開會暈眩<br>🟪 紫菱 <b>Ambusher</b> — 預判你的前進方向攔截<br><br>🛡️ 撿到藍色護盾道具可彈開幽靈一次，持續 5 秒。' },
            { title: '⚡ 陷阱與補血', text: '🔴 四角紅色尖刺：碰到會 <b>-15 分</b>、尾巴截掉 3 節，有 1 秒冷卻。<br><br>💚 綠色十字 <b>補血包</b>：會逃跑，撿到恢復 <b>+1 HP</b>，12 秒後消失。' },
            { title: '↔️ 邊界反彈', text: '蛇、幽靈、補血包碰到邊界都會 <b>反彈</b>，不會死亡。<br><br>遊戲沒有暫停功能，請在開始前做好準備！<br><br>🎯 目標：吃越多食物分數越高，存活越久！' }
          ]
        },
        en: {
          title: 'APEX SNAKE',
          rules: [
            '❤️ HP: Top-left hearts, 6 total. Ghosts deal 1 damage',
            '🍎 Food: Gold orbs, +10 score, speed up, body grows',
            '👻 Ghosts: Blue patrol, Red chase, Purple ambush. Hits = -1 HP',
            '🛡️ Shield: Blue item, deflects ghosts once, 5s duration',
            '💚 Heal: Green cross, runs away, restores +1 HP',
            '⚡ Spikes: Corner traps, -15 score, cut 3 tail segments',
            '↔️ Walls: Everything bounces off walls',
            '🔊 Enable sound! This game has full audio'
          ],
          start: 'START GAME',
          gameover: 'GAME OVER',
          restart: 'RESTART',
          score: 'SCORE',
          speed: 'SPEED',
          ghosts: 'GHOSTS',
          kills: 'BOUNCES',
          best: 'BEST',
          wasdMode: 'WASD Mode',
          joyMode: 'Joystick Mode',
          prev: 'Prev',
          next: 'Next',
          skip: 'Skip Tutorial',
          gotIt: 'Got it!',
          leaderboard: 'LEADERBOARD',
          noScores: 'No records yet',
          tutorial: [
            { title: '🎮 Controls & HP', text: 'Use <b>WASD</b> (diagonal supported) or the <b>joystick</b> to move.<br><br>Top-left <b>❤️ hearts</b> = HP (6 total). Ghost hits cost 1 HP. Zero HP = death.' },
            { title: '🍎 Food & Score', text: 'Gold orbs give <b>+10 score</b>, lengthen your snake, and increase speed.<br><br>Every <b>100 points</b> triggers a milestone sound.<br>Higher score = more ghosts (+1 per 50 score, max 8).' },
            { title: '👻 Ghosts & Shield', text: 'Three types:<br>🟦 Blue <b>Wanderer</b> — random patrol<br>🟥 Red <b>Chaser</b> — pursues you, stunned by shield<br>🟪 Purple <b>Ambusher</b> — predicts your path<br><br>🛡️ Blue shield item deflects ghosts once, lasts 5s.' },
            { title: '⚡ Traps & Heal', text: '🔴 Red corner spikes: <b>-15 score</b>, cut 3 tail segments, 1s cooldown.<br><br>💚 Green <b>health pack</b>: runs away from you, restores <b>+1 HP</b>, vanishes after 12s.' },
            { title: '↔️ Wall Bounce', text: 'Snake, ghosts, and health packs all <b>bounce off walls</b>. No wall-death.<br><br>No pause feature — be ready before you start!<br><br>🎯 Goal: Eat food, survive, get the highest score!' }
          ]
        }
      }
      return dict[this.currentLang][key]
    },

    toggleLang() {
      this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh'
    },

    ghostLabel() {
      const g = this.ghostsManager.ghosts
      if (!g || g.length === 0) return '-'
      let w = 0, c = 0, a = 0
      for (const ghost of g) {
        if (ghost.type === 'wanderer') w++
        else if (ghost.type === 'chaser') c++
        else a++
      }
      return `🟦${w} 🟥${c} 🟪${a}`
    },

    spawnFood() {
      for (let i = 0; i < 50; i++) {
        const x = 30 + Math.random() * (CW - 60)
        const y = 30 + Math.random() * (CH - 60)
        const close = this.snake.some(s => Math.hypot(s.x - x, s.y - y) < 40)
        if (!close) return { x, y }
      }
      return { x: CW / 2, y: CH / 2 }
    },

    initSnake() {
      this.snake = []
      for (let i = 0; i < this.initialSnakeLen; i++) {
        this.snake.push({ x: CW / 2 - i * this.segmentSpacing, y: CH / 2 })
      }
    },

    startGame() {
      if (!this._tutorial.isDone()) {
        this._pendingStart = true
        this.showTutorial = true
        this.tutorialPage = 0
        return
      }
      this._doStart()
    },

    _doStart() {
      if (this.score > 0) {
        this.leaderboard = this._highScore.addScore(this.score)
      }
      this.sound.initSound()
      this.score = 0
      this.hp = this.maxHp
      this.speed = this.baseSpeed
      this.deathIndex = 0
      this.kills = 0
      this.joystickAngle = 0
      this.joystickActive = false
      this.joystickDir = null
      this.shieldActive = false
      this.shieldEndTime = 0
      this.shieldPickup = null
      this.shieldSpawnTimer = 0
      this.spikeCooldown = 0
      this._lastMilestone = 0
      this._wasdKeys = { w: false, a: false, s: false, d: false }
      this.damageFx.reset()
      this.healthPickup.reset()
      this.initSnake()
      this.foods = [this.spawnFood(), this.spawnFood()]
      this.ghostsManager.initGhosts()
      this.gameState = 'playing'

      if (!this.animId) {
        this.lastFrameTime = performance.now()
        this.animId = requestAnimationFrame(t => this.gameLoop(t))
      }
    },

    gameLoop(ts) {
      const dt = Math.min((ts - this.lastFrameTime) / 1000, 0.05)
      this.lastFrameTime = ts

      if (this.gameState === 'playing') {
        this.updateAngle(dt)
        this.moveSnake(dt)
        this.checkEat()
        this.checkMilestone()
        this.ghostsManager.manageGhostCount(this.score)
        this.bounceWall()
        this.checkSpikes()
        if (this.spikeCooldown > 0) this.spikeCooldown -= dt
        this.ghostsManager.updateGhosts(dt, this.snake, this.speed)
        this.checkGhostCollision()
        this.checkShieldPickup()
        if (this.shieldActive && this.lastFrameTime > this.shieldEndTime) {
          this.shieldActive = false
        }
        this.shieldSpawnTimer += dt
        if (!this.shieldPickup && this.shieldSpawnTimer > 10) {
          this.spawnShieldPickup()
          this.shieldSpawnTimer = 0
        }
        this.damageFx.update(dt)
        this.healthPickup.update(dt, this.snake)
        this.healthPickup.trySpawn(dt, this.snake, this.hp, this.maxHp)
        if (this.healthPickup.checkPickup(this.snake)) {
          this.hp = Math.min(this.maxHp, this.hp + 1)
          this.sound.playPickupHealth()
        }
      } else if (this.gameState === 'dying') {
        this.deathIndex++
        if (this.deathIndex % 4 === 0) {
          if (this.snake.length > 0) this.snake.shift()
          if (this.snake.length === 0) this.gameState = 'gameover'
        }
      }

      this.drawCanvas(ts)
      this.animId = requestAnimationFrame(t => this.gameLoop(t))
    },

    updateAngle(dt) {
      if (this.controlMode === 'joystick') {
        if (this.joystickActive && this.joystickDir !== null) {
          let diff = this.joystickDir - this.joystickAngle
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          this.joystickAngle += diff * Math.min(1, dt * 8)
        }
      }
    },

    moveSnake(dt) {
      const step = this.speed * 60 * dt
      const head = this.snake[0]
      head.x += Math.cos(this.joystickAngle) * step
      head.y += Math.sin(this.joystickAngle) * step

      for (let i = 1; i < this.snake.length; i++) {
        const prev = this.snake[i - 1]
        const cur = this.snake[i]
        const dx = prev.x - cur.x
        const dy = prev.y - cur.y
        const dist = Math.hypot(dx, dy)
        if (dist > this.segmentSpacing) {
          cur.x = prev.x - (dx / dist) * this.segmentSpacing
          cur.y = prev.y - (dy / dist) * this.segmentSpacing
        }
      }
    },

    checkEat() {
      const h = this.snake[0]
      if (!h) return
      for (let i = 0; i < this.foods.length; i++) {
        if (Math.hypot(h.x - this.foods[i].x, h.y - this.foods[i].y) < 16) {
          this.score += 10
          this.sound.playEat()
          const tail = this.snake[this.snake.length - 1]
          this.snake.push({ x: tail.x, y: tail.y })
          this.foods[i] = this.spawnFood()
          this.speed = Math.min(5, this.speed + 0.2)
        }
      }
    },

    bounceWall() {
      const h = this.snake[0]
      if (!h) return
      const m = 16
      if (h.x < m) { h.x = m; this.joystickAngle = Math.PI - this.joystickAngle }
      if (h.x > CW - m) { h.x = CW - m; this.joystickAngle = Math.PI - this.joystickAngle }
      if (h.y < m) { h.y = m; this.joystickAngle = -this.joystickAngle }
      if (h.y > CH - m) { h.y = CH - m; this.joystickAngle = -this.joystickAngle }
    },

    checkSpikes() {
      const h = this.snake[0]
      if (!h || this.spikeCooldown > 0) return
      const sz = 40
      const zones = [
        { x: 0, y: 0, bx: sz, by: sz },
        { x: CW - sz, y: 0, bx: CW - sz, by: sz },
        { x: 0, y: CH - sz, bx: sz, by: CH - sz },
        { x: CW - sz, y: CH - sz, bx: CW - sz, by: CH - sz }
      ]
      for (const z of zones) {
        if (h.x >= z.x && h.x < z.x + sz && h.y >= z.y && h.y < z.y + sz) {
          this.score = Math.max(0, this.score - 15)
          const cut = Math.min(3, this.snake.length - 2)
          if (cut > 0) this.snake.splice(this.snake.length - cut, cut)
          this.spikeCooldown = 1
          this.sound.playSpikeHit()
          h.x = z.bx
          h.y = z.by
          this.joystickAngle += Math.PI
          return
        }
      }
    },

    drawSpikes(ctx) {
      const sz = 40
      ctx.fillStyle = '#c00'
      ctx.strokeStyle = '#f44'
      ctx.lineWidth = 2
      const spikes = [
        [0, 0, 1, 1],
        [CW - sz, 0, -1, 1],
        [0, CH - sz, 1, -1],
        [CW - sz, CH - sz, -1, -1]
      ]
      for (const [sx, sy, ox, oy] of spikes) {
        ctx.beginPath()
        ctx.moveTo(sx + (ox === 1 ? 0 : sz), sy + (oy === 1 ? 0 : sz))
        ctx.lineTo(sx + (ox === 1 ? sz : 0), sy + (oy === 1 ? 0 : sz))
        ctx.lineTo(sx + (ox === 1 ? 0 : sz), sy + (oy === 1 ? sz : 0))
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    },

    drawCanvas(ts) {
      const ctx = this.ctx
      const cw = CW, ch = CH
      const fx = this.damageFx.state
      const now = ts || performance.now()

      ctx.save()
      ctx.translate(fx.shakeX, fx.shakeY)

      ctx.fillStyle = '#0a0a18'
      ctx.fillRect(0, 0, cw, ch)
      this.drawGrid(ctx, cw, ch)
      this.drawSpikes(ctx)
      this.drawFoods(ctx)
      this.drawShieldPickup(ctx)
      this.ghostsManager.drawGhosts(ctx, now)
      this.drawSnake(ctx)
      this.drawShieldBarrier(ctx)
      this.healthPickup.draw(ctx, now)
      this.damageFx.drawParticles(ctx)

      ctx.restore()

      this.damageFx.drawHitFx(ctx, cw, ch)
      this.damageFx.drawLowHpGlow(ctx, this.hp, this.maxHp, cw, ch, now)
    },

    drawGrid(ctx, cw, ch) {
      ctx.strokeStyle = 'rgba(0,255,255,0.04)'
      ctx.lineWidth = 1
      for (let x = 0; x <= cw; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke()
      }
      for (let y = 0; y <= ch; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(0,255,255,0.08)'
      for (let x = 0; x <= cw; x += 160) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke()
      }
      for (let y = 0; y <= ch; y += 160) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke()
      }
    },

    drawSnake(ctx) {
      for (let i = this.snake.length - 1; i >= 0; i--) {
        const s = this.snake[i]
        const t = this.snake.length > 1 ? i / (this.snake.length - 1) : 0

        if (i === 0) {
          ctx.shadowBlur = 16
          ctx.shadowColor = 'rgba(0,232,104,0.5)'
          ctx.beginPath()
          ctx.arc(s.x, s.y, 10, 0, Math.PI * 2)
          ctx.fillStyle = '#00e868'
          ctx.fill()
          ctx.shadowBlur = 0

          const ed = 5, eo = 3.5
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(s.x + Math.cos(this.joystickAngle - 0.5) * ed,
                  s.y + Math.sin(this.joystickAngle - 0.5) * ed, eo, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(s.x + Math.cos(this.joystickAngle + 0.5) * ed,
                  s.y + Math.sin(this.joystickAngle + 0.5) * ed, eo, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#111'
          ctx.beginPath()
          ctx.arc(s.x + Math.cos(this.joystickAngle - 0.5) * (ed + 1.5),
                  s.y + Math.sin(this.joystickAngle - 0.5) * (ed + 1.5), 1.8, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(s.x + Math.cos(this.joystickAngle + 0.5) * (ed + 1.5),
                  s.y + Math.sin(this.joystickAngle + 0.5) * (ed + 1.5), 1.8, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const r = 8 - t * 2.5
          ctx.beginPath()
          ctx.arc(s.x, s.y, Math.max(r, 3), 0, Math.PI * 2)
          const g = Math.floor(170 - t * 120)
          ctx.fillStyle = `rgb(20, ${g}, 70)`
          ctx.fill()
          ctx.shadowBlur = 5
          ctx.shadowColor = `rgba(0, ${g}, 80, 0.25)`
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
    },

    drawFoods(ctx) {
      for (const f of this.foods) {
        const pulse = 1 + 0.1 * Math.sin(performance.now() * 0.005)
        ctx.shadowBlur = 20
        ctx.shadowColor = 'rgba(255,215,0,0.5)'
        ctx.beginPath()
        ctx.arc(f.x, f.y, 8 * pulse, 0, Math.PI * 2)
        ctx.fillStyle = '#ffd700'
        ctx.fill()
        ctx.shadowBlur = 0
      }
    },

    spawnShieldPickup() {
      for (let i = 0; i < 50; i++) {
        const x = 30 + Math.random() * (CW - 60)
        const y = 30 + Math.random() * (CH - 60)
        const close = this.snake.some(s => Math.hypot(s.x - x, s.y - y) < 40)
        if (!close) { this.shieldPickup = { x, y }; return }
      }
      this.shieldPickup = { x: CW / 2, y: CH / 2 }
    },

    checkShieldPickup() {
      const h = this.snake[0]
      if (!h || !this.shieldPickup) return
      if (Math.hypot(h.x - this.shieldPickup.x, h.y - this.shieldPickup.y) < 16) {
        this.shieldActive = true
        this.shieldEndTime = this.lastFrameTime + 5000
        this.shieldPickup = null
        this.sound.playPickupShield()
      }
    },

    drawShieldPickup(ctx) {
      if (!this.shieldPickup) return
      const p = this.shieldPickup
      const pulse = 1 + 0.15 * Math.sin(performance.now() * 0.006)
      ctx.shadowBlur = 25
      ctx.shadowColor = 'rgba(0,150,255,0.7)'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 10 * pulse, 0, Math.PI * 2)
      ctx.fillStyle = '#09f'
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('S', p.x, p.y - 1)
    },

    drawShieldBarrier(ctx) {
      if (!this.shieldActive) return
      const h = this.snake[0]
      if (!h) return
      const elapsed = performance.now() - (this.shieldEndTime - 5000)
      const t = Math.min(elapsed / 5000, 1)
      const alpha = (1 - t) * 0.4
      const radius = 24 * (1 - t)
      ctx.globalAlpha = alpha
      ctx.shadowBlur = 30
      ctx.shadowColor = 'rgba(0,150,255,0.6)'
      ctx.strokeStyle = '#09f'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(h.x, h.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    },

    recalcWASD() {
      const k = this._wasdKeys
      const dx = (k.d ? 1 : 0) - (k.a ? 1 : 0)
      const dy = (k.s ? 1 : 0) - (k.w ? 1 : 0)
      if (dx !== 0 || dy !== 0) {
        this.joystickAngle = Math.atan2(dy, dx)
      }
    },

    onKeyDown(e) {
      if (this.controlMode !== 'wasd') return
      const mapped = WASD_MAP[e.key]
      if (!mapped) return
      e.preventDefault()
      if (!this._wasdKeys[mapped]) {
        this._wasdKeys[mapped] = true
        this.recalcWASD()
      }
    },

    onKeyUp(e) {
      if (this.controlMode !== 'wasd') return
      const mapped = WASD_MAP[e.key]
      if (!mapped) return
      e.preventDefault()
      if (this._wasdKeys[mapped]) {
        this._wasdKeys[mapped] = false
        this.recalcWASD()
      }
    },

    openTutorial() {
      this.showTutorial = true
      this.tutorialPage = 0
    },

    closeTutorial() {
      this.showTutorial = false
      this._tutorial.markDone()
      if (this._pendingStart) {
        this._pendingStart = false
        this._doStart()
      }
    },

    skipTutorial() {
      this._tutorial.markDone()
      this.showTutorial = false
      if (this._pendingStart) {
        this._pendingStart = false
        this._doStart()
      }
    },

    rankIcon(i) {
      return ['🥇', '🥈', '🥉', ''][i] || ''
    },

    checkGhostCollision() {
      const result = this.ghostsManager.checkGhosts(this.snake, this.shieldActive)
      if (result === 'hit') {
        const h = this.snake[0]
        this.damageFx.triggerHit()
        if (h) this.damageFx.spawnBlood(h.x, h.y, this.joystickAngle + Math.PI)
        this.hp--
        if (this.hp <= 0) {
          this.sound.playDeath()
          this.gameState = 'dying'
          this.deathIndex = 0
        } else {
          this.sound.playGhostHit()
        }
      } else if (result === 'shieldBounce') {
        this.score += 20
        this.kills++
        const tail = this.snake[this.snake.length - 1]
        this.snake.push({ x: tail.x, y: tail.y })
        this.sound.playShieldBounce()
      }
    },

    checkMilestone() {
      const m = Math.floor(this.score / 100)
      if (m > this._lastMilestone) {
        this._lastMilestone = m
        this.sound.playMilestone()
      }
    },

    snapNESW(rad) {
      const dirs = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
      let norm = rad
      while (norm < 0) norm += Math.PI * 2
      let best = dirs[0]
      let minD = Infinity
      for (const d of dirs) {
        let diff = Math.abs(norm - d)
        if (diff > Math.PI) diff = Math.PI * 2 - diff
        if (diff < minD) { minD = diff; best = d }
      }
      return best
    },

    initJoystick() {
      const zone = document.getElementById('joystick-zone')
      if (!zone || this.nippleInstance) {
        return
      }
      try {
        if (!window.nipplejs) { return }
        this.nippleInstance = window.nipplejs.create({
          zone,
          mode: 'static',
          position: { left: '50%', top: '50%' },
          color: 'cyan',
          size: 120,
          restOpacity: 0.9
        })
        this.nippleInstance.on('move', (evt, data) => {
          if (data.angle) {
            this.joystickActive = true
            this.joystickDir = -data.angle.radian
          }
        })
        this.nippleInstance.on('end', () => {
          this.joystickActive = false
          this.joystickDir = null
        })
      } catch (e) {
        console.warn('Joystick error:', e)
      }
    }
  },

  mounted() {
    this.canvas = this.$refs.gameCanvas
    this.ctx = this.canvas.getContext('2d')
    this.initSnake()
    this.foods = [this.spawnFood(), this.spawnFood()]
    this.drawCanvas(performance.now())
    this.initJoystick()

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    if (this.animId) cancelAnimationFrame(this.animId)
    if (this.nippleInstance) {
      try { this.nippleInstance.destroy() } catch (e) {}
    }
  }
}
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}
.side-panel {
  width: 150px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  border: 1px solid rgba(0,255,255,0.1);
  justify-content: space-between;
}
.sp-hp { display: flex; flex-direction: column; gap: 2px; }
.hp-row { display: flex; }
.hp-heart { flex: 1; text-align: center; font-size: 26px; }
.sp-stat {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.sp-label { color: #6af; }
.sp-value { color: #0ff; font-weight: 700; }
.sp-divider { height: 1px; background: rgba(0,255,255,0.1); margin: 6px 0; }
.sp-section-title { font-size: 11px; color: #567; text-transform: uppercase; letter-spacing: 1px; }
.sp-lb-row { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.sp-lb-rank { font-size: 13px; width: 20px; text-align: center; }
.sp-lb-score { color: #ff0; font-weight: 700; }
.sp-best { color: #f80; font-size: 12px; }
.sp-empty { font-size: 11px; color: #456; }
.game-column { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.game-wrapper {
  position: relative;
  padding: 4px;
  border-radius: 12px;
  background: linear-gradient(270deg, #f0c, #33f, #0fc, #f0c, #33f, #0fc, #f0c);
  background-size: 500% 100%;
  animation: neonFlow 4s linear infinite;
}
@keyframes neonFlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 500% 50%; }
}

.canvas-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 960 / 720;
  overflow: hidden;
  border-radius: 8px;
  background: #0a0a18;
}
.canvas-wrap canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  border-radius: 8px;
  z-index: 10;
  padding: 20px;
  gap: 14px;
}
.overlay h1 {
  font-size: clamp(30px, 7vw, 56px);
  font-weight: 900;
  background: linear-gradient(135deg, #0ff, #f0f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 4px;
}
.overlay .rules { display: none; }
.overlay .btn {
  padding: 12px 36px;
  border: none;
  border-radius: 8px;
  font-size: clamp(16px, 2.5vw, 20px);
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 2px;
  transition: transform 0.12s, box-shadow 0.12s;
}
.overlay .btn:hover { transform: scale(1.05); }
.overlay .btn:active { transform: scale(0.95); }
.overlay .btn-start {
  background: linear-gradient(135deg, #0fc, #08f);
  color: #000;
  box-shadow: 0 0 24px rgba(0,255,204,0.35);
}
.overlay .btn-lang {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 6px 16px;
  background: rgba(255,255,255,0.08);
  color: #8cf;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.overlay .btn-lang:hover { background: rgba(255,255,255,0.15); }
.overlay .final-score {
  font-size: clamp(22px, 4vw, 36px);
  color: #ff0;
}

.mode-select {
  display: flex;
  gap: 10px;
}
.mode-btn {
  padding: 8px 24px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  color: #8cf;
  cursor: pointer;
  font-size: 15px;
  transition: all 0.15s;
}
.mode-btn:hover { background: rgba(255,255,255,0.1); }
.mode-btn.active {
  background: rgba(0,255,255,0.12);
  border-color: #0ff;
  color: #0ff;
  box-shadow: 0 0 12px rgba(0,255,255,0.2);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 500px;
}
.rule-line {
  font-size: clamp(11px, 1.8vw, 14px);
  color: #ace;
  text-align: left;
  line-height: 1.5;
}
.overlay .btn-help {
  position: absolute;
  top: 14px;
  left: 14px;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  color: #8cf;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.overlay .btn-help:hover { background: rgba(255,255,255,0.15); }

.tutorial-overlay {
  z-index: 20;
  cursor: pointer;
}
.tutorial-text {
  font-size: clamp(13px, 2.2vw, 16px);
  color: #cdf;
  text-align: center;
  max-width: 440px;
  line-height: 1.7;
}
.tutorial-text b { color: #0ff; }
.tutorial-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}
.btn-nav {
  padding: 6px 16px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: #8cf;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.12s;
}
.btn-nav:hover { background: rgba(255,255,255,0.12); }
.btn-nav-primary {
  background: rgba(0,255,200,0.12);
  border-color: #0fc;
  color: #0fc;
}
.btn-nav-skip {
  background: transparent;
  border-color: transparent;
  color: #678;
  font-size: 12px;
}
.btn-nav-skip:hover { color: #8ab; }
.tutorial-dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  transition: background 0.15s;
}
.dot.active { background: #0ff; box-shadow: 0 0 8px rgba(0,255,255,0.4); }

.joystick-ctrl {
  position: absolute;
  right: -255px;
  bottom: calc(14% - 35px);
  width: 140px;
  height: 140px;
  z-index: 5;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.15);
  touch-action: none;
}
.joystick-ctrl.disabled {
  opacity: 0.15;
  pointer-events: none;
}

@media (max-width: 700px) {
  .side-panel { display: none; }
  .game-row { flex-direction: column; }
  .joystick-ctrl { width: 100px; height: 100px; right: -185px; bottom: calc(10% - 25px); }
}
</style>
