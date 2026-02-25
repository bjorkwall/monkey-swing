import Phaser from 'phaser'

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
    this.worldW = 2400
    this.worldH = 900
    // Ground collision plane should sit 70px above the bottom of the world.
    this.groundY = this.worldH - 70

    this.keys = null
    this.cursors = null
    this.hud = null

    this.groundBody = null
    this.groundGfx = null

    this.ropeGfx = null
    this.treesGfx = null
    this.trees = []

    this.monkey = null
    this.monkeyContactsWithGround = 0

    this.grabConstraint = null
    this.grabbedTree = null

    this._monkeyVisualKey = null
    this._monkeySize = 26
    this._walkPhase = 0
  }

  preload() {
    // Put your monkey images in: public/assets/
    this.load.image('monkey-standing', 'assets/monkey-standing.png')
    this.load.image('monkey-jumping', 'assets/monkey-jumping.png')
    this.load.image('monkey-grabbing', 'assets/monkey-grabbing.png')
    this.load.image('monkey-walking-a', 'assets/monkey-walking-a.png')
    this.load.image('monkey-walking-b', 'assets/monkey-walking-b.png')

    // Backgrounds: public/assets/backgrounds/
    this.load.image('jungle-bg', 'assets/backgrounds/jungle-background.png')
  }

  create() {
    this.matter.world.setBounds(0, 0, this.worldW, this.worldH, 64, true, true, true, true)

    this._ensureMonkeyTextures()

    this._drawBackground()
    this._createGround()
    this._createTrees()
    this._createMonkey()
    this._createHUD()
    this._wireCollisions()

    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH)
    this.cameras.main.startFollow(this.monkey, true, 0.08, 0.08)
    this.cameras.main.setZoom(1)

    this.cursors = this.input.keyboard.createCursorKeys()

    this.keys = this.input.keyboard.addKeys({
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R
    })

    this.input.keyboard.on('keydown-D', () => this._tryGrab())
    this.input.keyboard.on('keydown-SPACE', () => this._jumpOrRelease())
    this.input.keyboard.on('keydown-R', () => this.scene.restart())
  }

  update() {
    if (!this.monkey) return

    if (this.monkey.y > this.worldH + 200) {
      this.scene.restart()
      return
    }

    this._handleMonkeyMovement()
    this._updateMonkeyVisual()

    this._driveLianas()
    const nearest = this._nearestBobWithin(70)
    this._updateTreeMarkers(nearest)
    this._drawRopes()
    this._updateHUD(nearest)
  }

  _drawBackground() {
    if (this.textures.exists('jungle-bg')) {
      const bg = this.add.image(this.worldW / 2, this.worldH / 2, 'jungle-bg').setDepth(-100)

      // "cover" the whole world area without stretching aspect ratio
      const sx = this.worldW / bg.width
      const sy = this.worldH / bg.height
      const s = Math.max(sx, sy)
      bg.setScale(s)
    } else {
      const g = this.add.graphics()
      g.fillStyle(0x0b1020, 1)
      g.fillRect(0, 0, this.worldW, this.worldH)

      // simple parallax-ish silhouettes
      const hills = this.add.graphics()
      hills.fillStyle(0x08102a, 1)
      for (let i = 0; i < 10; i++) {
        const x = i * 260
        hills.fillCircle(x + 120, this.worldH - 130, 220)
      }
    }
  }

  _createGround() {
    // Invisible ground: keep collisions, remove the green visual.
    this.groundBody = this.matter.add.rectangle(this.worldW / 2, this.groundY + 40, this.worldW, 80, {
      isStatic: true,
      friction: 0.8,
      restitution: 0
    })
  }

  _ensureMonkeyTextures() {
    // Procedural fallback so the monkey always shows up even without PNG assets.
    const required = [
      'monkey-standing',
      'monkey-jumping',
      'monkey-grabbing',
      'monkey-walking-a',
      'monkey-walking-b'
    ]
    if (required.every((k) => this.textures.exists(k))) return

    const W = 64
    const H = 64
    const brown = 0x6b3f2a
    const dark = 0x2a1b13
    const face = 0xd9b08c

    const make = (key, draw) => {
      if (this.textures.exists(key)) return
      const g = this.make.graphics({ x: 0, y: 0, add: false })
      draw(g)
      g.generateTexture(key, W, H)
      g.destroy()
    }

    const baseBody = (g) => {
      // Tail (behind)
      g.lineStyle(6, dark, 1)
      g.beginPath()
      g.moveTo(36, 42)
      g.quadraticCurveTo(54, 52, 46, 62)
      g.strokePath()

      // Body + head
      g.fillStyle(brown, 1)
      g.fillRoundedRect(24, 28, 18, 22, 8)
      g.fillCircle(33, 22, 12)

      // Face patch
      g.fillStyle(face, 1)
      g.fillCircle(33, 24, 7)

      // Eyes
      g.fillStyle(0x111827, 1)
      g.fillCircle(29, 21, 2)
      g.fillCircle(37, 21, 2)

      // Belly highlight
      g.fillStyle(0x8a5a3c, 0.9)
      g.fillRoundedRect(28, 34, 10, 12, 6)
    }

    make('monkey-standing', (g) => {
      baseBody(g)
      g.fillStyle(dark, 1)
      // Arms down
      g.fillRoundedRect(18, 30, 8, 18, 5)
      g.fillRoundedRect(40, 30, 8, 18, 5)
      // Legs neutral
      g.fillRoundedRect(26, 48, 7, 12, 5)
      g.fillRoundedRect(35, 48, 7, 12, 5)
    })

    make('monkey-walking-a', (g) => {
      baseBody(g)
      g.fillStyle(dark, 1)
      // Arms swing slightly
      g.fillRoundedRect(17, 32, 8, 16, 5)
      g.fillRoundedRect(41, 28, 8, 18, 5)
      // Legs stride
      g.fillRoundedRect(24, 48, 8, 12, 5)
      g.fillRoundedRect(37, 50, 6, 10, 5)
    })

    make('monkey-walking-b', (g) => {
      baseBody(g)
      g.fillStyle(dark, 1)
      // Arms swing opposite
      g.fillRoundedRect(17, 28, 8, 18, 5)
      g.fillRoundedRect(41, 32, 8, 16, 5)
      // Legs stride opposite
      g.fillRoundedRect(25, 50, 6, 10, 5)
      g.fillRoundedRect(36, 48, 8, 12, 5)
    })

    make('monkey-jumping', (g) => {
      baseBody(g)
      g.fillStyle(dark, 1)
      // Arms up
      g.fillRoundedRect(18, 18, 8, 18, 5)
      g.fillRoundedRect(40, 18, 8, 18, 5)
      // Legs tucked
      g.fillRoundedRect(26, 46, 8, 10, 5)
      g.fillRoundedRect(35, 46, 8, 10, 5)
    })

    make('monkey-grabbing', (g) => {
      baseBody(g)
      g.fillStyle(dark, 1)
      // One arm up grabbing, one down
      g.fillRoundedRect(40, 10, 8, 26, 5)
      g.fillRoundedRect(18, 32, 8, 16, 5)
      // Legs slightly tucked
      g.fillRoundedRect(26, 47, 7, 11, 5)
      g.fillRoundedRect(35, 47, 7, 11, 5)
    })
  }

  _createTrees() {
    // Layering: rope should render behind trees/platforms.
    this.ropeGfx = this.add.graphics().setDepth(1)
    this.treesGfx = this.add.graphics().setDepth(5)

    const platformColor = 0x7c4a2d
    const leafColor = 0x1f8a4c

    const platformDefs = [
      { x: 320, y: 260, w: 340, h: 30 },
      { x: 760, y: 220, w: 300, h: 30 },
      { x: 1180, y: 280, w: 340, h: 30 },
      { x: 1600, y: 230, w: 320, h: 30 },
      { x: 2000, y: 260, w: 340, h: 30 }
    ]

    const { Body } = Phaser.Physics.Matter.Matter

    for (let i = 0; i < platformDefs.length; i++) {
      const p = platformDefs[i]

      this.matter.add.rectangle(p.x, p.y, p.w, p.h, {
        isStatic: true,
        friction: 0.25,
        restitution: 0.05
      })

      // visuals: platform ("tree branch")
      this.treesGfx.fillStyle(platformColor, 1)
      this.treesGfx.fillRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 10)

      // leaf blobs on top
      this.treesGfx.fillStyle(leafColor, 0.9)
      this.treesGfx.fillCircle(p.x - p.w * 0.25, p.y - 34, 22)
      this.treesGfx.fillCircle(p.x, p.y - 42, 26)
      this.treesGfx.fillCircle(p.x + p.w * 0.25, p.y - 34, 22)

      // Blue pivot point: at bottom of the brown platform
      const pivotX = p.x
      const pivotY = p.y + p.h / 2
      const pivotBody = this.matter.add.circle(pivotX, pivotY, 6, { isStatic: true })
      const pivotMarker = this.add.circle(pivotX, pivotY, 6, 0x38bdf8, 1).setDepth(10)

      // Yellow bob point: end of liana under the platform
      const desiredLen = this.groundY - pivotY - 45
      const len = Phaser.Math.Clamp(desiredLen, 220, 520)
      const bobStartX = pivotX + 80 * (i % 2 === 0 ? 1 : -1)
      const bobStartY = pivotY + len

      const bobMarker = this.add.circle(bobStartX, bobStartY, 8, 0xfde047, 1).setDepth(11)
      bobMarker.setStrokeStyle(2, 0x111827, 0.45)

      const bob = this.matter.add.gameObject(bobMarker, {
        shape: { type: 'circle', radius: 8 },
        frictionAir: 0.001,
        friction: 0.05,
        restitution: 0.05,
        density: 0.001
      })

      // Liana constraint: pivot -> bob
      const liana = this.matter.add.constraint(pivotBody, bob.body, len, 0.92, { damping: 0.005 })

      // Give it an initial push so it starts swinging.
      bob.setVelocity((i % 2 === 0 ? 6 : -6), 0)

      // Store tree/liana setup
      this.trees.push({
        pivotBody,
        pivotMarker,
        bob,
        liana,
        len,
        phaseOffset: i * 0.7,
        // used for highlight
        defaultBobColor: 0xfde047
      })

      // Keep pivot marker glued (static body doesn't move, but keep consistent)
      pivotMarker.x = pivotX
      pivotMarker.y = pivotY

      // Ensure constraint length doesn't drift if bob gets nudged violently
      Body.setInertia(bob.body, Infinity)
    }
  }

  _createMonkey() {
    const size = this._monkeySize
    const startX = 220
    const startY = this.groundY - size / 2 - 2

    // `_ensureMonkeyTextures()` guarantees this exists, even without PNG files.
    const monkeyDisplay = this.add.image(startX, startY, 'monkey-standing').setDepth(20)
    monkeyDisplay.setDisplaySize(size, size)
    monkeyDisplay.setOrigin(0.5, 0.5)
    this._monkeyVisualKey = 'monkey-standing'

    this.monkey = this.matter.add.gameObject(monkeyDisplay, {
      shape: { type: 'rectangle', width: size, height: size },
      frictionAir: 0.01,
      friction: 0.2,
      restitution: 0,
      density: 0.004
    })

    this.monkey.setFixedRotation()
  }

  _createHUD() {
    this.hud = this.add
      .text(16, 14, '', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '14px',
        color: '#e5e7eb'
      })
      .setScrollFactor(0)
      .setDepth(1000)
  }

  _updateHUD(nearest) {
    const state = this.grabConstraint ? 'på lian' : this._canJump() ? 'på mark' : 'i luften'
    const nearTxt = nearest ? `nära lian: ja` : 'nära lian: nej'
    this.hud.setText(
      [
        'Monkey Swing (prototype)',
        'Piltangenter = vänster/höger   D = grabba gul punkt   Space = hoppa / släpp+hoppa   R = restart',
        `state: ${state}   ${nearTxt}`
      ].join('\n')
    )
  }

  _handleMonkeyMovement() {
    if (!this.cursors) return
    if (this.grabConstraint) return // when attached to liana, movement is physics-driven

    const left = this.cursors.left?.isDown
    const right = this.cursors.right?.isDown
    const onGround = this._canJump()

    const vx = this.monkey.body.velocity.x
    const maxSpeed = onGround ? 7 : 5.5

    let desiredVx = 0
    if (left && !right) desiredVx = -maxSpeed
    else if (right && !left) desiredVx = maxSpeed

    if (desiredVx === 0) {
      // manual damping for a snappy platformer feel
      const damp = onGround ? 0.82 : 0.97
      this.monkey.setVelocityX(vx * damp)
    } else {
      const lerp = onGround ? 0.22 : 0.08
      this.monkey.setVelocityX(Phaser.Math.Linear(vx, desiredVx, lerp))
    }
  }

  _updateMonkeyVisual() {
    if (!this.monkey) return

    const hasTextures = [
      'monkey-standing',
      'monkey-jumping',
      'monkey-grabbing',
      'monkey-walking-a',
      'monkey-walking-b'
    ].every((k) => this.textures.exists(k))
    if (!hasTextures) return

    const onGround = this._canJump()
    const vx = this.monkey.body.velocity.x
    const absVx = Math.abs(vx)

    let key = 'monkey-standing'
    if (this.grabConstraint) key = 'monkey-grabbing'
    else if (!onGround) key = 'monkey-jumping'
    else if (absVx > 1.2) {
      this._walkPhase += 0.22 + Phaser.Math.Clamp(absVx * 0.02, 0, 0.25)
      key = Math.floor(this._walkPhase) % 2 === 0 ? 'monkey-walking-a' : 'monkey-walking-b'
    } else {
      this._walkPhase = 0
    }

    if (key !== this._monkeyVisualKey && typeof this.monkey.setTexture === 'function') {
      this.monkey.setTexture(key)
      this.monkey.setDisplaySize(this._monkeySize, this._monkeySize)
      this._monkeyVisualKey = key
    }

    if (typeof this.monkey.setFlipX === 'function') {
      if (absVx > 0.15) this.monkey.setFlipX(vx < 0)
    }
  }

  _wireCollisions() {
    const isMonkeyAndGround = (a, b) =>
      (a === this.monkey.body && b === this.groundBody) || (b === this.monkey.body && a === this.groundBody)

    this.matter.world.on('collisionstart', (event) => {
      for (const pair of event.pairs) {
        if (isMonkeyAndGround(pair.bodyA, pair.bodyB)) this.monkeyContactsWithGround++
      }
    })

    this.matter.world.on('collisionend', (event) => {
      for (const pair of event.pairs) {
        if (isMonkeyAndGround(pair.bodyA, pair.bodyB)) {
          this.monkeyContactsWithGround = Math.max(0, this.monkeyContactsWithGround - 1)
        }
      }
    })
  }

  _canJump() {
    return this.monkeyContactsWithGround > 0
  }

  _jumpOrRelease() {
    if (this.grabConstraint) {
      this._jumpFromLiana()
      return
    }

    if (this._canJump()) {
      this._jumpImpulse(false)
    }
  }

  _jumpFromLiana() {
    if (!this.grabConstraint || !this.grabbedTree) return

    const t = this.grabbedTree
    const pivot = t.pivotBody?.position ?? { x: t.pivotMarker.x, y: t.pivotMarker.y }
    const bob = t.bob?.body?.position ?? { x: t.bob.x, y: t.bob.y }

    const rx = bob.x - pivot.x
    const ry = bob.y - pivot.y
    const rLen = Math.hypot(rx, ry) || 1
    const ux = rx / rLen
    const uy = ry / rLen

    // Two tangents; pick the one matching our current movement direction.
    const t1x = -uy
    const t1y = ux
    const t2x = uy
    const t2y = -ux

    const vx = this.monkey.body.velocity.x
    const vy = this.monkey.body.velocity.y
    const d1 = t1x * vx + t1y * vy
    const useT1 = d1 >= 0
    const tx = useT1 ? t1x : t2x
    const ty = useT1 ? t1y : t2y

    // Tilt 15 degrees upward (towards -Y) from the tangent direction.
    const a = Phaser.Math.DegToRad(15)
    const upx = 0
    const upy = -1
    let dirx = tx * Math.cos(a) + upx * Math.sin(a)
    let diry = ty * Math.cos(a) + upy * Math.sin(a)
    const dLen = Math.hypot(dirx, diry) || 1
    dirx /= dLen
    diry /= dLen

    const speed = Math.max(4, Math.hypot(vx, vy))

    this._releaseGrab()
    this.monkey.setVelocity(dirx * speed, diry * speed)
  }

  _jumpImpulse(fromLiana) {
    // A simple jump impulse. If jumping from liana, keep horizontal momentum.
    const vx = this.monkey.body.velocity.x
    const boostX = fromLiana ? Phaser.Math.Clamp(vx * 0.0025, -0.02, 0.02) : 0
    this.monkey.applyForce({ x: boostX, y: -0.05 })
  }

  _tryGrab() {
    if (this.grabConstraint) return

    const nearest = this._nearestBobWithin(70)
    if (!nearest) return

    // Snap to the bob and match its velocity so the liana keeps its direction/momentum.
    const bx = nearest.bob.body.position.x
    const by = nearest.bob.body.position.y
    this.monkey.setPosition(bx, by)
    this.monkey.setVelocity(nearest.bob.body.velocity.x, nearest.bob.body.velocity.y)

    // Grab by attaching monkey to the liana end (yellow bob).
    this.grabConstraint = this.matter.add.constraint(this.monkey.body, nearest.bob.body, 0, 0.95, {
      damping: 0.02
    })
    this.grabbedTree = nearest
  }

  _releaseGrab() {
    if (!this.grabConstraint) return
    this.matter.world.removeConstraint(this.grabConstraint)
    this.grabConstraint = null
    this.grabbedTree = null
  }

  _nearestBobWithin(maxDist) {
    let best = null
    let bestD = maxDist
    for (const t of this.trees) {
      const d = Phaser.Math.Distance.Between(this.monkey.x, this.monkey.y, t.bob.x, t.bob.y)
      if (d < bestD) {
        best = t
        bestD = d
      }
    }
    return best
  }

  _updateTreeMarkers(nearestTree) {
    for (const t of this.trees) {
      t.pivotMarker.setFillStyle(0x38bdf8, 1)
      t.pivotMarker.setScale(1)

      t.bob.setFillStyle(t.defaultBobColor, 1)
      t.bob.setScale(1)
    }

    if (nearestTree) {
      nearestTree.bob.setFillStyle(0xfbbf24, 1)
      nearestTree.bob.setScale(1.25)
    }
  }

  _drawRopes() {
    this.ropeGfx.clear()
    this.ropeGfx.lineStyle(3, 0x22c55e, 0.8)

    for (const t of this.trees) {
      this.ropeGfx.beginPath()
      this.ropeGfx.moveTo(t.pivotMarker.x, t.pivotMarker.y)
      this.ropeGfx.lineTo(t.bob.x, t.bob.y)
      this.ropeGfx.strokePath()
    }
  }

  _driveLianas() {
    // Keep the bobs gently swinging (so the yellow point traces a pendulum arc).
    const { Body } = Phaser.Physics.Matter.Matter
    const time = this.time.now * 0.001

    for (const t of this.trees) {
      const drive = Math.sin(time + t.phaseOffset) * 0.00045
      Body.applyForce(t.bob.body, t.bob.body.position, { x: drive, y: 0 })
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1200,
  height: 800,
  backgroundColor: '#0b1020',
  scene: [GameScene],
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.1 },
      debug: false
    }
  }
}

new Phaser.Game(config)

