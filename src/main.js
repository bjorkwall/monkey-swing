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
    this.platforms = []

    this.monkey = null
    this.monkeyContactsWithGround = 0
    this._lastGroundedAt = 0

    this.grabConstraint = null
    this.grabbedTree = null
    this.isGrabbing = false
    this.grabRatio = 1

    this.bananas = []
    this._bananaCleanup = []
    this.bananaScore = 0
    this.bananaCounterBg = null
    this.bananaCounterIcon = null
    this.bananaCounterText = null

    this.bambooSprite = null
    this._isClimbingBamboo = false
    this._isOnBambooTop = false
    this._bambooTopLine = null
    this._bambooGrabActive = false
    this._bambooGrabFrame = 1
    this._lastBambooGrabFrameAt = 0
    this._isSick = false
    this._sickImmobilizeUntil = 0
    this._sickAnimStart = 0
    this.crocodiles = []
    this._crocNextId = 0
    this._lastCrocFrameAt = 0
    this._crocFrame = 1
    this._isGameOver = false
    this._gameOverUntil = 0
    this._gameOverText = null
    this._gameOverTitle = null
    this._gameOverNumber = null
    this._gameOverBg = null

    this._bgm = null
    this._isMuted = false
    this._muteButton = null
    this._isMobile = false
    this._mobile = { left: false, right: false, up: false, down: false }
    this._joystick = {
      base: null,
      knob: null,
      pointerId: null,
      radius: 40,
      centerX: 0,
      centerY: 0
    }
    this._crocSpawnAt = 0
    this._crocActive = false
    this._crocTimerText = null
    this._crocTimerIcon = null
    this._isOnTreePlatform = false

    this._extraJumpAvailable = false

    this._jumpBoostActive = false
    this._jumpBoostUntil = 0
    this._jumpTargetY = 0
    this._jumpStartX = 0
    this._jumpStartY = 0
    this._jumpDirX = 0
    this._jumpDirY = -1
    this._jumpTargetAlong = 0

    this._monkeyVisualKey = null
    this._monkeySize = 78
    this._walkPhase = 0
    this._lastRunFrameAt = 0
    this._faceDir = 1
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.warn('Asset failed to load (will use fallbacks):', file.key, file.url)
    })
    // Put your monkey images in: public/assets/monkey/
    this.load.image('monkey-standing', 'assets/monkey/monkey-standing.png')
    this.load.image('monkey-run-right', 'assets/monkey/monkey-run.png')
    this.load.image('monkey-run-right-2', 'assets/monkey/monkey-run-right-2.png')
    this.load.image('monkey-run-left', 'assets/monkey/monkey-run-left.png')
    this.load.image('monkey-run-left-2', 'assets/monkey/monkey-run-left-2.png')
    this.load.image('monkey-jumping', 'assets/monkey/monkey-jump.png')
    this.load.image('monkey-jump-left', 'assets/monkey/monkey-jump-left.png')
    this.load.image('monkey-grabbing', 'assets/monkey/monkey-swing.png')
    this.load.image('monkey-grab-left', 'assets/monkey/monkey-swing-left.png')
    this.load.image('monkey-grab-1', 'assets/monkey/monkey-grab-1.png')
    this.load.image('monkey-grab-2', 'assets/monkey/monkey-grab-2.png')
    this.load.image('monkey-sick-1', 'assets/monkey/monkey-sick-1.png')
    this.load.image('monkey-sick-2', 'assets/monkey/monkey-sick-2.png')
    this.load.image('monkey-sick-3', 'assets/monkey/monkey-sick-3.png')
    this.load.image('monkey-sick-4', 'assets/monkey/monkey-sick-4.png')
    this.load.image('crocodile-left-1', 'assets/crocodile/crocodile-left-1.png')
    this.load.image('crocodile-left-2', 'assets/crocodile/crocodile-left-2.png')
    this.load.image('crocodile-right-1', 'assets/crocodile/crocodile-right-1.png')
    this.load.image('crocodile-right-2', 'assets/crocodile/crocodile-right-2.png')
    this.load.audio('bgm', 'assets/music/monkey_swing.mp3')
    this.load.image('banana', 'assets/bananas/banana.png')
    this.load.image('rotten-banana', 'assets/bananas/rotten-banana.png')
    this.load.image('bamboo', 'assets/plants/bamboo.png')
    this.load.image('liana', 'assets/plants/liana.png')
    this.load.image('tree-crown', 'assets/plants/tree-crown.png')

    // Backgrounds: public/assets/backgrounds/
    this.load.image('jungle-bg', 'assets/backgrounds/jungle-background.png')
  }

  create() {
    // Debug: if you see this text, the scene is running (remove once fixed)
    this.add.text(16, 16, 'Scene started', { fontSize: '14px', color: '#88ff88' }).setScrollFactor(0).setDepth(9999)

    // Hard reset on restart
    if (this.crocodiles?.length) {
      for (const c of this.crocodiles) c.destroy()
    }
    this.crocodiles = []
    this._crocNextId = 0
    this._crocActive = false
    this._crocSpawnAt = 0
    this._isGameOver = false
    this._gameOverUntil = 0
    if (this._gameOverBg) this._gameOverBg.setVisible(false)
    if (this._gameOverTitle) this._gameOverTitle.setVisible(false)
    if (this._gameOverNumber) this._gameOverNumber.setVisible(false)

    try {
      if (!this.matter || !this.matter.world) {
        throw new Error('Matter physics not available on scene')
      }
      this.matter.world.setBounds(0, 0, this.worldW, this.worldH, 64, true, true, true, true)

      this._ensureMonkeyTextures()

      this._drawBackground()
      this._createGround()
      this._createTrees()
      this._createBananas()
      this._createMonkey()
      this._createCrocodile()
      this._createHUD()
      this._createAudio()
      this._wireCollisions()
    } catch (err) {
      console.error('[GameScene] create() failed:', err)
      this.add.text(20, 20, `Error: ${err.message}`, { fontSize: '16px', color: '#ff6b6b' }).setScrollFactor(0)
      return
    }

    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH)
    this.cameras.main.startFollow(this.monkey, true, 0.08, 0.08)
    this.cameras.main.setZoom(1)
    // Start camera at bottom of world so monkey and ground are visible from frame one
    const cam = this.cameras.main
    const maxScrollX = Math.max(0, this.worldW - cam.width)
    const maxScrollY = Math.max(0, this.worldH - cam.height)
    cam.setScroll(
      Phaser.Math.Clamp(this.monkey.x - cam.width / 2, 0, maxScrollX),
      Phaser.Math.Clamp(this.monkey.y - cam.height / 2, 0, maxScrollY)
    )

    this.cursors = this.input.keyboard.createCursorKeys()

    if (this.input?.keyboard) {
      this.input.keyboard.removeAllListeners()
      this.input.keyboard.enabled = true
    }

    this.keys = this.input.keyboard.addKeys({
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R
    })

    this.input.keyboard.on('keydown-D', () => this._tryGrab())
    this.input.keyboard.on('keydown-SPACE', () => this._jumpOrRelease())
    this.input.keyboard.on('keydown-R', () => this.scene.restart())

    this.game.events.on('focus', () => {
      if (this.input?.keyboard) this.input.keyboard.enabled = true
    })

    this._isMobile = window.matchMedia?.('(pointer: coarse)').matches || /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent)
    if (this._isMobile) this._createMobileControls()

    this._crocSpawnAt = (this.time?.now ?? 0) + 30000
    this._crocActive = false
    this.bananaScore = 0
    if (this.bananaCounterText) this.bananaCounterText.setText('0')
    if (this._crocTimerText) this._crocTimerText.setText('30')
  }

  update() {
    if (!this.monkey) return

    if (!this.cursors && this.input?.keyboard) this.cursors = this.input.keyboard.createCursorKeys()
    if (!this.keys && this.input?.keyboard) {
      this.keys = this.input.keyboard.addKeys({
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        r: Phaser.Input.Keyboard.KeyCodes.R
      })
    }

    this._updateGameOver()
    if (this.monkey.y > this.worldH + 200) {
      this.scene.restart()
      return
    }

    this._refreshGrounded()
    this._updateSickState()
    this._handleBambooClimb()
    this._safetyResetStates()
    this._handleMonkeyMovement()
    this._updateMonkeyVisual()

    this._updateCrocodile()
    this._driveLianas()
    const nearest = this._nearestBobWithin(70)
    this._updateTreeMarkers(nearest)
    this._drawRopes()
    this._updateHUD(nearest)

    if (this.isGrabbing) {
      this._handleLianaClimb()
      this._syncGrabbedMonkey()
    }

    this._applyJumpBoost()
    this._checkBananaOverlap()
    this._flushBananaCleanup()
    this._checkCrocodileHit()
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
      'monkey-run-right',
      'monkey-run-right-2',
      'monkey-run-left',
      'monkey-run-left-2',
      'monkey-jumping',
      'monkey-jump-left',
      'monkey-grabbing',
      'monkey-grab-left'
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
      const tailPath = new Phaser.Curves.Path(36, 42)
      tailPath.quadraticBezierTo(46, 62, 54, 52)
      tailPath.draw(g)

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

    make('monkey-run-right', (g) => {
      baseBody(g)
      g.fillStyle(dark, 1)
      // Arms swing
      g.fillRoundedRect(17, 28, 8, 18, 5)
      g.fillRoundedRect(41, 32, 8, 16, 5)
      // Legs stride
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

    make('monkey-jump-left', (g) => {
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

    make('monkey-grab-left', (g) => {
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
      { x: 900, y: 220, w: 300, h: 30 },
      { x: 1480, y: 280, w: 340, h: 30 },
      { x: 2060, y: 260, w: 340, h: 30 }
    ]

    let lowestPlatformY = -Infinity
    for (let i = 0; i < platformDefs.length; i++) {
      const p = platformDefs[i]
      lowestPlatformY = Math.max(lowestPlatformY, p.y)

      this.matter.add.rectangle(p.x, p.y, p.w, p.h, {
        isStatic: true,
        friction: 0.25,
        restitution: 0.05
      })
      this.platforms.push({ x: p.x, y: p.y, w: p.w, h: p.h })

      // visuals: platform ("tree branch") - transparent (physics only)

      // tree crown overlay
      if (this.textures.exists('tree-crown')) {
        const crown = this.add.image(p.x, p.y - 46, 'tree-crown').setDepth(6)
        const scale = p.w / crown.width
        crown.setScale(scale)
      }

      // Blue pivot point: at bottom of the brown platform
      const pivotX = p.x
      const pivotY = p.y + p.h / 2
      const pivotBody = this.matter.add.circle(pivotX, pivotY, 6, { isStatic: true, isSensor: true })

      // Yellow bob point: end of liana under the platform
      const desiredLen = this.groundY - pivotY - 45
      const len = Phaser.Math.Clamp(desiredLen, 220, 520)
      const bobStartX = pivotX + 80 * (i % 2 === 0 ? 1 : -1)
      const bobStartY = pivotY + len

      const bobMarker = this.add.circle(bobStartX, bobStartY, 8, 0xfde047, 1).setDepth(11)
      bobMarker.setStrokeStyle(2, 0x111827, 0.45)
      bobMarker.setVisible(false)

      const bob = this.matter.add.gameObject(bobMarker, {
        shape: { type: 'circle', radius: 8 },
        frictionAir: 0.001,
        friction: 0.05,
        restitution: 0.05,
        density: 0.001
      })
      bob.setSensor(true)

      // Store tree/liana setup
      let lianaSprite = null
      let lianaWidth = 24
      if (this.textures.exists('liana')) {
        const img = this.textures.get('liana')?.getSourceImage()
        lianaWidth = Math.max(4, img?.width ?? 24)
        lianaSprite = this.add.tileSprite(pivotX, pivotY, lianaWidth, len, 'liana')
          .setOrigin(0.5, 0)
          .setDepth(2)
          .setTileScale(1, 1)
      }

      this.trees.push({
        pivotBody,
        bob,
        lianaSprite,
        lianaWidth,
        len,
        baseLen: len,
        phaseOffset: i * 0.7,
        // used for highlight
        defaultBobColor: 0xfde047
      })

    }

    // Bamboo between two random platforms
    if (this.platforms.length >= 2 && this.textures.exists('bamboo')) {
      const i = Phaser.Math.Between(0, this.platforms.length - 2)
      const a = this.platforms[i]
      const b = this.platforms[i + 1]
      const leftEdge = a.x + a.w / 2 + 20
      const rightEdge = b.x - b.w / 2 - 20
      const bx = rightEdge > leftEdge ? Phaser.Math.Between(leftEdge, rightEdge) : (a.x + b.x) / 2

      const lowestY = lowestPlatformY > 0 ? lowestPlatformY : a.y
      const targetH = Math.max(120, (this.groundY - lowestY) * 0.9)
      const img = this.textures.get('bamboo')?.getSourceImage()
      const bambooW = img?.width ?? 32
      const bamboo = this.add.tileSprite(bx, this.groundY, bambooW, targetH, 'bamboo').setDepth(6)
      bamboo.setOrigin(0.5, 1)
      this.bambooSprite = bamboo

      // Visualize bamboo plateau (70px wide) with a red line
      const plateauW = 70
      const topY = this.bambooSprite.y - this.bambooSprite.displayHeight
      this._bambooTopLine = this.add.graphics().setDepth(8)
      this._bambooTopLine.lineStyle(3, 0xef4444, 0)
      this._bambooTopLine.lineBetween(bx - plateauW / 2, topY, bx + plateauW / 2, topY)
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

  _createCrocodile() {
    if (!this.textures.exists('crocodile-right-1')) return
    const y = this.groundY - 16
    const croc = this.add.image(-200, y, 'crocodile-right-1').setDepth(15)
    croc.setDisplaySize(180, 80)
    croc.setVisible(false)
    croc.setData('dir', 1)
    croc.setData('id', this._crocNextId++)
    this.crocodiles.push(croc)
  }

  _createBananas() {
    if (!this.textures.exists('banana')) return

    const bananaSize = 48
    const bananaRadius = bananaSize * 0.45
    const minBananaDist = 30

    const isTooCloseToPlatforms = (x, y) => {
      for (const p of this.platforms) {
        const left = p.x - p.w / 2 - minBananaDist
        const right = p.x + p.w / 2 + minBananaDist
        const top = p.y - p.h / 2 - minBananaDist
        const bottom = p.y + p.h / 2 + minBananaDist
        if (x >= left && x <= right && y >= top && y <= bottom) return true
      }
      return false
    }

    const isTooCloseToOtherBananas = (x, y) => {
      for (const b of this.bananas) {
        const dx = b.x - x
        const dy = b.y - y
        if (Math.hypot(dx, dy) < bananaSize + minBananaDist) return true
      }
      return false
    }

    const addBanana = (x, y, type = 'banana') => {
      const img = this.add.image(x, y, type).setDepth(12)
      img.setDisplaySize(bananaSize, bananaSize)
      const banana = this.matter.add.gameObject(img, {
        isStatic: true,
        isSensor: true,
        shape: { type: 'circle', radius: bananaRadius }
      })
      banana.body.label = type
      banana.setData('collected', false)
      banana.setData('type', type)
      banana.setData('radius', bananaRadius)
      this.bananas.push(banana)
    }

    // One banana per platform
    for (const p of this.platforms) {
      const x = p.x
      const y = p.y - p.h / 2 - bananaSize * 0.6
      if (!isTooCloseToOtherBananas(x, y)) addBanana(x, y)
    }

    // Random bananas across the level
    const randomCount = 12
    for (let i = 0; i < randomCount; i++) {
      let placed = false
      for (let attempt = 0; attempt < 25 && !placed; attempt++) {
        const x = Phaser.Math.Between(100, this.worldW - 100)
        const y = Phaser.Math.Between(140, Math.max(160, this.groundY - this._monkeySize * 2.5))
        if (isTooCloseToPlatforms(x, y)) continue
        if (isTooCloseToOtherBananas(x, y)) continue
        addBanana(x, y)
        placed = true
      }
    }

    // Exactly two rotten bananas
    if (this.textures.exists('rotten-banana')) {
      let placedCount = 0
      for (let attempt = 0; attempt < 80 && placedCount < 2; attempt++) {
        const x = Phaser.Math.Between(120, this.worldW - 120)
        const y = Phaser.Math.Between(140, Math.max(160, this.groundY - this._monkeySize * 2.5))
        if (isTooCloseToPlatforms(x, y)) continue
        if (isTooCloseToOtherBananas(x, y)) continue
        addBanana(x, y, 'rotten-banana')
        placedCount++
      }
    }
  }

  _createHUD() {
    this.hud = this.add
      .text(16, 14, '', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '14px',
        color: '#000000'
      })
      .setScrollFactor(0)
      .setDepth(1000)

    const cam = this.cameras.main
    const boxW = 140
    const boxH = 44
    const pad = 16
    const x = cam.width - boxW - pad
    const y = pad

    this.bananaCounterBg = this.add.graphics().setScrollFactor(0).setDepth(1000)
    this.bananaCounterBg.fillStyle(0x111827, 0.7)
    this.bananaCounterBg.fillRoundedRect(x, y, boxW, boxH, 10)
    this.bananaCounterBg.lineStyle(4, 0x3f2a1d, 0.95)
    this.bananaCounterBg.strokeRoundedRect(x, y, boxW, boxH, 10)

    this.bananaCounterIcon = this.add.image(x + 24, y + boxH / 2, 'banana').setScrollFactor(0).setDepth(1001)
    this.bananaCounterIcon.setDisplaySize(28, 28)

    this.bananaCounterText = this.add
      .text(x + 48, y + 10, '0', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '18px',
        color: '#fde68a'
      })
      .setScrollFactor(0)
      .setDepth(1001)

    // Crocodile timer (same box)
    this._crocTimerIcon = this.add.image(x + 92, y + boxH / 2, 'crocodile-right-1').setScrollFactor(0).setDepth(1001)
    this._crocTimerIcon.setDisplaySize(30, 18)
    this._crocTimerText = this.add
      .text(x + 112, y + 10, '30', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '16px',
        color: '#ffffff'
      })
      .setScrollFactor(0)
      .setDepth(1001)

    // Mute button
    const muteX = x - 56
    const muteY = y
    const muteW = 40
    const muteH = 44
    this._muteButton = this.add
      .text(muteX + muteW / 2, muteY + 12, '🔊', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '18px',
        color: '#111827'
      })
      .setScrollFactor(0)
      .setDepth(1002)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })

    const muteBg = this.add.graphics().setScrollFactor(0).setDepth(1001)
    muteBg.fillStyle(0x111827, 0.7)
    muteBg.fillRoundedRect(muteX, muteY, muteW, muteH, 10)
    muteBg.lineStyle(3, 0xdc2626, 1)
    muteBg.strokeRoundedRect(muteX, muteY, muteW, muteH, 10)

    this._muteButton.on('pointerdown', () => {
      this._toggleMute()
    })
  }

  _createAudio() {
    if (!this.sound || !this.cache.audio.exists('bgm')) return
    if (!this._bgm) {
      this._bgm = this.sound.add('bgm', { loop: true, volume: 0.35 })
      if (!this._isMuted) this._bgm.play()
    }
  }

  _toggleMute() {
    this._isMuted = !this._isMuted
    if (this._bgm) {
      if (this._isMuted) this._bgm.pause()
      else this._bgm.resume()
    }
    if (this._muteButton) this._muteButton.setText(this._isMuted ? '🔇' : '🔊')
  }

  _updateHUD(nearest) {
    const state = this.isGrabbing ? 'på lian' : this._canJump() ? 'på mark' : 'i luften'
    const nearTxt = nearest ? `nära lian: ja` : 'nära lian: nej'
    this.hud.setText(
      [
        'Monkey Swing (prototype)',
        'Piltangenter = vänster/höger   D = grabba gul punkt   Space = hoppa / släpp+hoppa   R = restart',
        `state: ${state}   ${nearTxt}`,
        `monkey-state: ${this._monkeyVisualKey ?? 'n/a'}`
      ].join('\n')
    )
  }

  _handleMonkeyMovement() {
    if (!this.cursors && !this._isMobile) return
    if (this.isGrabbing) return // when attached to liana, movement is physics-driven
    if (this._isClimbingBamboo && !this._isOnBambooTop) return
    if (this._isGameOver) return
    if (this._isSick) {
      if (this._sickImmobilizeUntil > (this.time?.now ?? 0)) this.monkey.setVelocityX(0)
      this.monkey.setVelocityX(0)
      return
    }

    const left = this._inputLeft()
    const right = this._inputRight()
    const onGround = this._isGrounded()

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
      'monkey-run-right',
      'monkey-run-right-2',
      'monkey-run-left',
      'monkey-run-left-2',
      'monkey-jumping',
      'monkey-jump-left',
      'monkey-grabbing',
      'monkey-grab-left',
      'monkey-grab-1',
      'monkey-grab-2',
      'monkey-sick-1',
      'monkey-sick-2',
      'monkey-sick-3',
      'monkey-sick-4'
    ].every((k) => this.textures.exists(k))
    if (!hasTextures) return

    const onGround = this._isGrounded()
    const vx = this.monkey.body.velocity.x
    const absVx = Math.abs(vx)

    let key = 'monkey-standing'
    const now = this.time?.now ?? 0

    if (this._isSick && this._sickImmobilizeUntil > now) {
      const frame = Math.floor((now - this._sickAnimStart) / 375) % 4
      key = ['monkey-sick-1', 'monkey-sick-2', 'monkey-sick-3', 'monkey-sick-4'][frame]
    }
    else if (this.isGrabbing) {
      const t = this.grabbedTree
      const left =
        t && t.bob?.body && t.pivotBody ? t.bob.body.position.x < t.pivotBody.position.x : this._faceDir < 0
      key = left ? 'monkey-grab-left' : 'monkey-grabbing'
    }
    else if (this._isClimbingBamboo) {
      if (this._bambooGrabActive) {
        if (!this._lastBambooGrabFrameAt) this._lastBambooGrabFrameAt = now
        if (now - this._lastBambooGrabFrameAt >= 100) {
          this._lastBambooGrabFrameAt = now
          this._bambooGrabFrame = this._bambooGrabFrame === 1 ? 2 : 1
        }
      }
      key = this._bambooGrabFrame === 1 ? 'monkey-grab-1' : 'monkey-grab-2'
    }
    else if (this._isOnBambooTop) {
      key = 'monkey-standing'
    }
    else if (this._isOnTreePlatform && absVx <= 1.2) {
      key = 'monkey-standing'
    }
    else if (!onGround) {
      if (vx < -0.1 || this._faceDir < 0) key = 'monkey-jump-left'
      else key = 'monkey-jumping'
    }
    else if (absVx > 1.2) {
      const now2 = now
      if (!this._lastRunFrameAt) this._lastRunFrameAt = now2
      if (now2 - this._lastRunFrameAt >= 100) {
        this._lastRunFrameAt = now2
        this._walkPhase = (this._walkPhase + 1) % 2
      }
      const frame = this._walkPhase % 2 === 0 ? 1 : 2
      if (vx < 0) key = frame === 1 ? 'monkey-run-left' : 'monkey-run-left-2'
      else key = frame === 1 ? 'monkey-run-right' : 'monkey-run-right-2'
    } else {
      this._walkPhase = 0
      this._lastRunFrameAt = 0
    }
    // Force standing when grounded (ground or any plateau).
    if (onGround && !this.isGrabbing && !(this._isSick && this._sickImmobilizeUntil > now)) {
      key = absVx > 1.2 ? key : 'monkey-standing'
    }

    if (key !== this._monkeyVisualKey && typeof this.monkey.setTexture === 'function') {
      this.monkey.setTexture(key)
      this.monkey.setDisplaySize(this._monkeySize, this._monkeySize)
      this._monkeyVisualKey = key
    }

    if (typeof this.monkey.setFlipX === 'function') {
      this.monkey.setFlipX(false)
    }

    if (absVx > 0.15) this._faceDir = vx < 0 ? -1 : 1
  }

  _updateCrocodile() {
    if (this._isGameOver) return
    const now = this.time?.now ?? 0

    const remaining = Math.max(0, Math.ceil((this._crocSpawnAt - now) / 1000))
    if (this._crocTimerText) this._crocTimerText.setText(String(remaining))
    if (now >= this._crocSpawnAt) {
      this._crocActive = true
      const croc = this.crocodiles.find((c) => !c.visible)
      if (croc) {
        croc.x = -60
        croc.setData('dir', 1)
        croc.setVisible(true)
      } else {
        this._createCrocodile()
        const created = this.crocodiles[this.crocodiles.length - 1]
        created.x = -60
        created.setData('dir', 1)
        created.setVisible(true)
      }
      this._crocSpawnAt = now + 20000
    }
    if (!this._crocActive) return

    if (!this._lastCrocFrameAt) this._lastCrocFrameAt = now
    if (now - this._lastCrocFrameAt >= 200) {
      this._lastCrocFrameAt = now
      this._crocFrame = this._crocFrame === 1 ? 2 : 1
    }

    const speed = 1.4
    const minX = 80
    const maxX = this.worldW - 80
    for (const croc of this.crocodiles) {
      if (!croc.visible) continue
      const dir = croc.getData('dir') ?? 1
      croc.x += speed * dir

      if (croc.x <= minX) {
        croc.x = minX
        croc.setData('dir', 1)
      } else if (croc.x >= maxX) {
        croc.x = maxX
        croc.setData('dir', -1)
      }

      const dirKey = (croc.getData('dir') ?? 1) < 0 ? 'left' : 'right'
      const frameKey = `crocodile-${dirKey}-${this._crocFrame}`
      if (croc.texture.key !== frameKey) {
        croc.setTexture(frameKey)
        croc.setDisplaySize(180, 80)
      }
    }
  }

  _checkCrocodileHit() {
    if (!this.crocodiles.length || this._isGameOver) return
    for (const croc of this.crocodiles) {
      if (!croc.visible) continue
      const dx = Math.abs(this.monkey.x - croc.x)
      const dy = Math.abs(this.monkey.y - croc.y)
      if (dx < 40 && dy < 30) {
        this._startGameOver()
        return
      }
    }
  }

  _startGameOver() {
    if (this._isGameOver) return
    this._isGameOver = true
    const now = this.time?.now ?? 0
    this._gameOverUntil = now + 5000
    this.monkey.setVelocity(0, 0)
    this.monkey.setIgnoreGravity(false)
    this.monkey.setStatic(false)
    this.monkey.setSensor(false)

    if (!this._gameOverBg) {
      const cx = this.cameras.main.width / 2
      const cy = this.cameras.main.height / 2
      const bw = 260
      const bh = 160
      const radius = 14
      this._gameOverBg = this.add.graphics().setScrollFactor(0).setDepth(2000)
      this._gameOverBg.fillStyle(0xfef3c7, 0.7)
      this._gameOverBg.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, radius)
      this._gameOverBg.lineStyle(4, 0x3f2a1d, 1)
      this._gameOverBg.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, radius)

      this._gameOverTitle = this.add
        .text(cx, cy - 40, 'Game Over', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontSize: '42px',
          color: '#111827',
          align: 'center'
        })
        .setScrollFactor(0)
        .setOrigin(0.5, 0.5)
        .setDepth(2001)

      this._gameOverNumber = this.add
        .text(cx, cy + 30, '5', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontSize: '84px',
          color: '#111827',
          align: 'center'
        })
        .setScrollFactor(0)
        .setOrigin(0.5, 0.5)
        .setDepth(2001)
    }
    this._gameOverBg.setVisible(true)
    this._gameOverTitle.setVisible(true)
    this._gameOverNumber.setVisible(true)
    this._gameOverNumber.setText('5')
  }

  _updateGameOver() {
    if (!this._isGameOver) return
    const now = this.time?.now ?? 0
    const remaining = Math.max(0, Math.ceil((this._gameOverUntil - now) / 1000))
    if (this._gameOverNumber) {
      this._gameOverNumber.setText(String(remaining))
    }
    if (now >= this._gameOverUntil) {
      if (this._gameOverBg) this._gameOverBg.setVisible(false)
      if (this._gameOverTitle) this._gameOverTitle.setVisible(false)
      if (this._gameOverNumber) this._gameOverNumber.setVisible(false)
      this._isGameOver = false
      this.scene.restart()
    }
  }

  _wireCollisions() {
    const isMonkeyAndGround = (a, b) =>
      (a === this.monkey.body && b === this.groundBody) || (b === this.monkey.body && a === this.groundBody)
    const isMonkeyAndBanana = (a, b) =>
      (a === this.monkey.body && (b.label === 'banana' || b.label === 'rotten-banana')) ||
      (b === this.monkey.body && (a.label === 'banana' || a.label === 'rotten-banana'))

    this.matter.world.on('collisionstart', (event) => {
      for (const pair of event.pairs) {
        if (isMonkeyAndGround(pair.bodyA, pair.bodyB)) {
          this.monkeyContactsWithGround++
          this._lastGroundedAt = this.time?.now ?? 0
        }
        if (isMonkeyAndBanana(pair.bodyA, pair.bodyB)) {
          const bananaBody =
            pair.bodyA.label === 'banana' || pair.bodyA.label === 'rotten-banana' ? pair.bodyA : pair.bodyB
          if (bananaBody.label === 'rotten-banana') this._collectRottenBanana(bananaBody.gameObject)
          else this._collectBanana(bananaBody.gameObject)
        }
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

  _collectBanana(banana) {
    if (!banana || banana.getData('collected')) return
    banana.setData('collected', true)
    banana.setVisible(false)
    banana.body && (banana.body.isSensor = true)
    this._bananaCleanup.push(banana)
    this.bananaScore += 1
    if (this.bananaCounterText) this.bananaCounterText.setText(String(this.bananaScore))
  }

  _collectRottenBanana(banana) {
    if (!banana || banana.getData('collected')) return
    banana.setData('collected', true)
    banana.setVisible(false)
    banana.body && (banana.body.isSensor = true)
    this._bananaCleanup.push(banana)
    this.bananaScore = Math.max(0, this.bananaScore - 3)
    if (this.bananaCounterText) this.bananaCounterText.setText(String(this.bananaScore))
    this._enterSickState()
  }

  _enterSickState() {
    if (this._isSick) return
    this._isSick = true
    this._sickImmobilizeUntil = 0
    this._sickAnimStart = 0

    if (this.isGrabbing) {
      // Drop from current position on the liana.
      const t = this.grabbedTree
      if (t?.bob?.body?.position && t?.pivotBody?.position) {
        const px = t.pivotBody.position.x
        const py = t.pivotBody.position.y
        const bx = t.bob.body.position.x
        const by = t.bob.body.position.y
        const gx = px + (bx - px) * this.grabRatio
        const gy = py + (by - py) * this.grabRatio
        this.monkey.setPosition(gx, gy)
      }
      this._releaseGrab()
    }
    if (this._isClimbingBamboo) {
      this._isClimbingBamboo = false
      this.monkey.setIgnoreGravity(false)
    }
    if (this._isOnBambooTop) {
      this._isOnBambooTop = false
      this.monkey.setIgnoreGravity(false)
    }
    this.monkey.setStatic(false)
    this.monkey.setSensor(false)
    this.monkey.setVelocity(0, 0)
  }

  _updateSickState() {
    if (!this._isSick) return
    const now = this.time?.now ?? 0

    if (this._sickImmobilizeUntil === 0 && this._isGrounded()) {
      this._sickImmobilizeUntil = now + 3000
      this._sickAnimStart = now
    }

    if (this._sickImmobilizeUntil > 0 && now >= this._sickImmobilizeUntil) {
      this._isSick = false
      this._sickImmobilizeUntil = 0
      this._sickAnimStart = 0
    }
  }

  _checkBananaOverlap() {
    if (!this.monkey) return
    const mx = this.monkey.x
    const my = this.monkey.y
    const mR = this._monkeySize * 0.5
    for (const b of this.bananas) {
      if (!b || b.getData('collected') || !b.body || !b.body.position) continue
      const r = b.getData('radius') ?? 20
      const dx = b.body.position.x - mx
      const dy = b.body.position.y - my
      if (dx * dx + dy * dy <= (mR + r) * (mR + r)) {
        const type = b.getData('type') ?? 'banana'
        if (type === 'rotten-banana') this._collectRottenBanana(b)
        else this._collectBanana(b)
      }
    }
  }

  _flushBananaCleanup() {
    if (this._bananaCleanup.length === 0) return
    for (const b of this._bananaCleanup) {
      if (b && b.body) this.matter.world.remove(b.body)
      if (b && b.destroy) b.destroy()
    }
    this._bananaCleanup = []
    this.bananas = this.bananas.filter((b) => b && !b.getData('collected'))
  }

  _isGrounded() {
    if (this.monkeyContactsWithGround > 0) return true
    const now = this.time?.now ?? 0
    return now - this._lastGroundedAt <= 150
  }

  _canJump() {
    return this._isGrounded()
  }

  _jumpOrRelease() {
    if (this._isGameOver) return
    if (this._isSick) return
    if (this._isClimbingBamboo) {
      this._isClimbingBamboo = false
      this.monkey.setIgnoreGravity(false)
      this._jumpImpulse(false)
      this._extraJumpAvailable = true
      return
    }
    if (this.isGrabbing) {
      this._jumpFromLiana()
      this._extraJumpAvailable = true
      return
    }

    if (this._canJump()) {
      this._jumpImpulse(false)
      this._extraJumpAvailable = true
      return
    }

    if (this._extraJumpAvailable) {
      this._jumpImpulse(false)
      this._extraJumpAvailable = false
    }
  }

  _jumpFromLiana() {
    if (!this.isGrabbing || !this.grabbedTree) return

    const t = this.grabbedTree
    const pivot = t.pivotBody.position
    const bob = t.bob?.body?.position ?? { x: t.bob.x, y: t.bob.y }

    const rx = bob.x - pivot.x
    const ry = bob.y - pivot.y
    const rLen = Math.hypot(rx, ry) || 1
    const ux = rx / rLen
    const uy = ry / rLen

    // Liana angle: 0 = up, 90 = right, 180 = down, 270 = left.
    const angleUp = (Phaser.Math.RadToDeg(Math.atan2(rx, -ry)) + 360) % 360
    const jumpAngle = angleUp <= 179 ? angleUp - 90 : angleUp + 90
    const a = Phaser.Math.DegToRad(jumpAngle)
    const dirx = Math.sin(a)
    const diry = -Math.cos(a)

    this._releaseGrab()
    this._jumpImpulse(false, dirx, diry, 2)
  }

  _jumpImpulse(fromLiana, dirx = 0, diry = -1, jumpScale = 1) {
    // A simple jump impulse. If jumping from liana, keep horizontal momentum.
    const vx = this.monkey.body.velocity.x
    const boostX = fromLiana ? Phaser.Math.Clamp(vx * 0.0025, -0.02, 0.02) : 0
    const jumpHeight = this._monkeySize * 2 * jumpScale
    const dLen = Math.hypot(dirx, diry) || 1
    dirx /= dLen
    diry /= dLen
    this._jumpStartX = this.monkey.x
    this._jumpStartY = this.monkey.y
    this._jumpDirX = dirx
    this._jumpDirY = diry
    this._jumpTargetAlong = jumpHeight
    this._jumpTargetY = this.monkey.y - jumpHeight
    this._jumpBoostUntil = (this.time?.now ?? 0) + 320
    this._jumpBoostActive = true
    if (!fromLiana) {
      const left = this._inputLeft()
      const right = this._inputRight()
      const dir = left && !right ? -1 : right && !left ? 1 : this._faceDir || 1
      const horizSpeed = 4.5
      this.monkey.setVelocityX(dir * horizSpeed)
    }
    const baseSpeed = 6 * jumpScale
    this.monkey.setVelocity(dirx * baseSpeed, diry * baseSpeed)
    this.monkey.applyForce({ x: boostX + dirx * 0.02 * jumpScale, y: diry * 0.02 * jumpScale })
  }

  _tryGrab() {
    if (this._isGameOver) return
    if (this._isSick) return
    if (this.isGrabbing) return

    const maxDist = 70
    let best = null
    let bestD = maxDist
    let bestRatio = 1

    for (const t of this.trees) {
      const px = t.pivotBody.position.x
      const py = t.pivotBody.position.y
      const bx = t.bob.body.position.x
      const by = t.bob.body.position.y
      const vx = bx - px
      const vy = by - py
      const len2 = vx * vx + vy * vy || 1
      const wx = this.monkey.x - px
      const wy = this.monkey.y - py
      let ratio = (wx * vx + wy * vy) / len2
      ratio = Phaser.Math.Clamp(ratio, 0, 1)
      const cx = px + vx * ratio
      const cy = py + vy * ratio
      const d = Phaser.Math.Distance.Between(this.monkey.x, this.monkey.y, cx, cy)
      if (d < bestD) {
        best = t
        bestD = d
        bestRatio = ratio
      }
    }

    if (!best) return

    if (this._isClimbingBamboo) {
      this._isClimbingBamboo = false
      this.monkey.setIgnoreGravity(false)
    }
    if (this._isOnBambooTop) {
      this._isOnBambooTop = false
      this.monkey.setIgnoreGravity(false)
    }

    const gx = best.pivotBody.position.x + (best.bob.body.position.x - best.pivotBody.position.x) * bestRatio
    const gy = best.pivotBody.position.y + (best.bob.body.position.y - best.pivotBody.position.y) * bestRatio
    this.monkey.setPosition(gx, gy)
    this.monkey.setVelocity(best.bob.body.velocity.x, best.bob.body.velocity.y)

    // Visually attach the monkey to the liana end without affecting its physics.
    this.monkey.setStatic(true)
    this.monkey.setSensor(true)
    this.monkey.setIgnoreGravity(true)
    this.monkey.setVelocity(0, 0)
    this._jumpBoostActive = false
    this.isGrabbing = true
    this.grabbedTree = best
    this.grabRatio = bestRatio
  }

  _releaseGrab() {
    if (!this.isGrabbing) return
    this.monkey.setStatic(false)
    this.monkey.setSensor(false)
    this.monkey.setIgnoreGravity(false)
    this.isGrabbing = false
    this.grabbedTree = null
    this.grabRatio = 1
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

  _syncGrabbedMonkey() {
    if (!this.grabbedTree) return
    const px = this.grabbedTree.pivotBody.position.x
    const py = this.grabbedTree.pivotBody.position.y
    const bx = this.grabbedTree.bob.body.position.x
    const by = this.grabbedTree.bob.body.position.y
    const gx = px + (bx - px) * this.grabRatio
    const gy = py + (by - py) * this.grabRatio
    this.monkey.setPosition(gx, gy)
    this.monkey.setVelocity(this.grabbedTree.bob.body.velocity.x, this.grabbedTree.bob.body.velocity.y)
  }

  _handleLianaClimb() {
    if (!this.cursors && !this._isMobile) return
    if (this._isSick) return
    const up = this._inputUp()
    const down = this._inputDown()
    if (!up && !down) return

    const dt = (this.game?.loop?.delta ?? 16) / 1000
    const speed = 0.6 // ratio units per second
    const dir = up && !down ? -1 : down && !up ? 1 : 0
    if (dir === 0) return

    if (down && this.grabRatio >= 0.98) {
      const t = this.grabbedTree
      if (t?.bob?.body?.position && t?.pivotBody?.position) {
        this.grabRatio = 1
        const px = t.pivotBody.position.x
        const py = t.pivotBody.position.y
        const bx = t.bob.body.position.x
        const by = t.bob.body.position.y
        if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(bx) && Number.isFinite(by)) {
          this.monkey.setPosition(bx, by)
          this.monkey.setVelocity(t.bob.body.velocity.x, t.bob.body.velocity.y)
        }
      }
      this._releaseGrab()
      this.monkey.setIgnoreGravity(false)
      this.monkey.setStatic(false)
      return
    }

    this.grabRatio = Phaser.Math.Clamp(this.grabRatio + dir * speed * dt, 0.08, 1)
  }

  _isMonkeyOnBamboo() {
    if (!this.bambooSprite) return false
    const pad = 8
    const left = this.bambooSprite.x - this.bambooSprite.displayWidth / 2 - pad
    const right = this.bambooSprite.x + this.bambooSprite.displayWidth / 2 + pad
    const top = this.bambooSprite.y - this.bambooSprite.displayHeight
    const bottom = this.bambooSprite.y
    const cap = this._monkeySize * 0.5
    return this.monkey.x >= left && this.monkey.x <= right && this.monkey.y >= top - cap && this.monkey.y <= bottom
  }

  _bambooSideBounds() {
    const pad = 8
    const left = this.bambooSprite.x - this.bambooSprite.displayWidth / 2 - pad
    const right = this.bambooSprite.x + this.bambooSprite.displayWidth / 2 + pad
    return { left, right }
  }

  _bambooTopBounds() {
    const top = this.bambooSprite.y - this.bambooSprite.displayHeight
    const plateauW = 70
    const left = this.bambooSprite.x - plateauW / 2
    const right = this.bambooSprite.x + plateauW / 2
    return { top, left, right }
  }

  _handleBambooClimb() {
    if ((!this.cursors && !this._isMobile) || !this.monkey) return
    if (this._isSick) return
    if (this.isGrabbing) return
    const up = this._inputUp()
    const down = this._inputDown()
    const onBamboo = this._isMonkeyOnBamboo()

    if (!onBamboo) {
      if (this._isClimbingBamboo) {
        this._isClimbingBamboo = false
        this.monkey.setIgnoreGravity(false)
      }
      if (this._isOnBambooTop) {
        this._isOnBambooTop = false
        this.monkey.setIgnoreGravity(false)
      }
      this._bambooGrabActive = false
      return
    }

    if (!this._isClimbingBamboo && !up) {
      // Do not auto-stick to bamboo. Only start climbing when pressing up.
      return
    }

    if (!up && !down) {
      // If already climbing, stay in place with no gravity.
      if (this._isClimbingBamboo) {
        this.monkey.setIgnoreGravity(true)
        this.monkey.setVelocityX(0)
        this.monkey.setVelocityY(0)
      }
      this._bambooGrabActive = false
      return
    }

    const top = this.bambooSprite.y - this.bambooSprite.displayHeight
    const bottom = this.bambooSprite.y
    const minY = top - this._monkeySize / 2
    const maxY = bottom - this._monkeySize / 2
    const { left, right } = this._bambooSideBounds()

    this._isClimbingBamboo = true
    this._isOnBambooTop = false
    this._bambooGrabActive = true
    this.monkey.setStatic(false)
    this.monkey.setIgnoreGravity(true)
    const leftKey = this._inputLeft()
    const rightKey = this._inputRight()
    let vx = 0
    if (leftKey && !rightKey) vx = -3
    else if (rightKey && !leftKey) vx = 3
    this.monkey.setVelocityX(vx)

    if (up && !down) this.monkey.setVelocityY(-4)
    else if (down && !up) this.monkey.setVelocityY(4)
    else this.monkey.setVelocityY(0)

    if (this.monkey.y < minY) this.monkey.setPosition(this.monkey.x, minY)
    if (this.monkey.y > maxY) {
      this.monkey.setPosition(this.monkey.x, maxY)
      // Reaching the bottom lets go of the bamboo so movement resumes.
      this._isClimbingBamboo = false
      this.monkey.setIgnoreGravity(false)
      this.monkey.setVelocityY(0)
      this._bambooGrabActive = false
    }
    if (this.monkey.x < left) this.monkey.setPosition(left, this.monkey.y)
    if (this.monkey.x > right) this.monkey.setPosition(right, this.monkey.y)

    const topThreshold = minY + this._monkeySize * 0.03
    if (this.monkey.y <= topThreshold) {
      this._isClimbingBamboo = false
      this._isOnBambooTop = true
      this._bambooGrabActive = false
      this.monkey.setIgnoreGravity(false)
      this.monkey.setVelocity(0, 0)
      this.monkey.setPosition(this.monkey.x, minY)
    }
  }

  _safetyResetStates() {
    if (!this.monkey) return

    // If bamboo flags are set but we're not on bamboo anymore, clear them.
    if ((this._isClimbingBamboo || this._isOnBambooTop) && !this._isMonkeyOnBamboo()) {
      this._isClimbingBamboo = false
      this._isOnBambooTop = false
      this.monkey.setIgnoreGravity(false)
    }

    // If grabbing state is inconsistent, release.
    if (this.isGrabbing && !this.grabbedTree) {
      this._releaseGrab()
    }

    // Ensure we aren't stuck static/sensor unless actively grabbing or climbing.
    if (!this.isGrabbing && !this._isClimbingBamboo && !this._isOnBambooTop) {
      if (this.monkey.body.isStatic) this.monkey.setStatic(false)
      this.monkey.setIgnoreGravity(false)
      this.monkey.setSensor(false)
    }

    // If any movement input is pressed, forcefully unstick.
    const anyMove = this._anyMovePressed()
    if (anyMove && !this.isGrabbing && !this._isClimbingBamboo) {
      if (this.monkey.body.isStatic) this.monkey.setStatic(false)
      this.monkey.setIgnoreGravity(false)
      this.monkey.setSensor(false)
    }
  }

  _inputLeft() {
    return Boolean(this.cursors?.left?.isDown || this._mobile?.left)
  }
  _inputRight() {
    return Boolean(this.cursors?.right?.isDown || this._mobile?.right)
  }
  _inputUp() {
    return Boolean(this.cursors?.up?.isDown || this._mobile?.up)
  }
  _inputDown() {
    return Boolean(this.cursors?.down?.isDown || this._mobile?.down)
  }
  _anyMovePressed() {
    return this._inputLeft() || this._inputRight() || this._inputUp() || this._inputDown()
  }

  _createMobileControls() {
    const cam = this.cameras.main
    const pad = 18
    const baseR = 88
    const knobR = 36
    const cx = pad + baseR
    const cy = cam.height - pad - baseR

    const base = this.add.graphics().setScrollFactor(0).setDepth(3000)
    base.fillStyle(0x111827, 0.5)
    base.fillCircle(cx, cy, baseR)
    base.lineStyle(2, 0x3f2a1d, 0.9)
    base.strokeCircle(cx, cy, baseR)

    const knob = this.add.graphics().setScrollFactor(0).setDepth(3001)
    knob.fillStyle(0xfef3c7, 0.9)
    knob.fillCircle(cx, cy, knobR)

    this._joystick.base = base
    this._joystick.knob = knob
    this._joystick.centerX = cx
    this._joystick.centerY = cy
    this._joystick.radius = baseR

    const jumpBtn = this.add
      .text(cam.width - pad - 140, cam.height - pad - 180, 'JUMP', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '32px',
        color: '#111827',
        backgroundColor: '#fef3c7',
        padding: { x: 20, y: 16 }
      })
      .setScrollFactor(0)
      .setDepth(3001)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
    jumpBtn.on('pointerdown', () => this._jumpOrRelease())

    const grabBtn = this.add
      .text(cam.width - pad - 140, cam.height - pad - 56, 'GRAB', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '32px',
        color: '#111827',
        backgroundColor: '#fef3c7',
        padding: { x: 20, y: 16 }
      })
      .setScrollFactor(0)
      .setDepth(3001)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
    grabBtn.on('pointerdown', () => this._tryGrab())

    this.input.on('pointerdown', (p) => {
      const dx = p.x - cx
      const dy = p.y - cy
      if (Math.hypot(dx, dy) <= baseR) {
        this._joystick.pointerId = p.id
        this._updateJoystick(p)
      }
    })

    this.input.on('pointermove', (p) => {
      if (this._joystick.pointerId === p.id) this._updateJoystick(p)
    })

    this.input.on('pointerup', (p) => {
      if (this._joystick.pointerId === p.id) {
        this._joystick.pointerId = null
        this._joystick.knob.clear()
        this._joystick.knob.fillStyle(0xfef3c7, 0.9)
        this._joystick.knob.fillCircle(cx, cy, knobR)
        this._mobile.left = this._mobile.right = this._mobile.up = this._mobile.down = false
      }
    })
  }

  _updateJoystick(p) {
    const j = this._joystick
    const dx = p.x - j.centerX
    const dy = p.y - j.centerY
    const dist = Math.hypot(dx, dy)
    const max = j.radius
    const nx = dist > 0 ? dx / dist : 0
    const ny = dist > 0 ? dy / dist : 0
    const clamped = Math.min(dist, max)
    const kx = j.centerX + nx * clamped
    const ky = j.centerY + ny * clamped

    j.knob.clear()
    j.knob.fillStyle(0xfef3c7, 0.9)
    j.knob.fillCircle(kx, ky, 36)

    const dead = 0.25
    const ax = dx / max
    const ay = dy / max
    this._mobile.left = ax < -dead
    this._mobile.right = ax > dead
    this._mobile.up = ay < -dead
    this._mobile.down = ay > dead
  }

  _refreshGrounded() {
    const monkeyBottom = this.monkey.y + this._monkeySize / 2
    if (monkeyBottom >= this.groundY - 2 && this.monkey.body.velocity.y >= 0) {
      this._lastGroundedAt = this.time?.now ?? 0
      this._extraJumpAvailable = false
      this._isOnTreePlatform = false
      return
    }

    if (this.bambooSprite) {
      const { top, left, right } = this._bambooTopBounds()
      if (
        monkeyBottom >= top - 2 &&
        monkeyBottom <= top + 4 &&
        this.monkey.x >= left &&
        this.monkey.x <= right &&
        this.monkey.body.velocity.y >= 0
      ) {
        this._lastGroundedAt = this.time?.now ?? 0
        this._extraJumpAvailable = false
        this._isOnTreePlatform = false
        this._isOnBambooTop = true
        this._isClimbingBamboo = false
        this.monkey.setIgnoreGravity(false)
        this.monkey.setVelocityY(0)
        this.monkey.setPosition(this.monkey.x, top - this._monkeySize / 2)
        return
      }
    }

    for (const p of this.platforms) {
      const top = p.y - p.h / 2
      if (
        monkeyBottom >= top - 10 &&
        monkeyBottom <= top + 10 &&
        this.monkey.x >= p.x - p.w / 2 &&
        this.monkey.x <= p.x + p.w / 2 &&
        this.monkey.body.velocity.y >= -0.5
      ) {
        this._lastGroundedAt = this.time?.now ?? 0
        this._extraJumpAvailable = false
        this._isOnTreePlatform = true
        return
      }
    }
    this._isOnTreePlatform = false
  }

  _applyJumpBoost() {
    if (!this._jumpBoostActive || this.isGrabbing) return
    const now = this.time?.now ?? 0
    if (now > this._jumpBoostUntil) {
      this._jumpBoostActive = false
      return
    }
    if (!this.monkey) {
      this._jumpBoostActive = false
      return
    }
    const dx = this.monkey.x - this._jumpStartX
    const dy = this.monkey.y - this._jumpStartY
    const traveled = dx * this._jumpDirX + dy * this._jumpDirY
    if (traveled < this._jumpTargetAlong) {
      this.monkey.applyForce({ x: this._jumpDirX * 0.02, y: this._jumpDirY * 0.02 })
    } else {
      this._jumpBoostActive = false
    }
  }

  _capLianaDepth() {
    if (!this.monkey) return
    const { Body } = Phaser.Physics.Matter.Matter
    const maxFromGround = this.groundY - this._monkeySize * 1.2
    const maxBobY = maxFromGround
    const maxAngle = Phaser.Math.DegToRad(60)

    for (const t of this.trees) {
      const pivotY = t.pivotBody.position.y
      const maxLen = t.baseLen

      // Clamp swing to between 8 and 4 o'clock relative to straight down (±60°).
      const dx = t.bob.body.position.x - t.pivotBody.position.x
      const dy = t.bob.body.position.y - t.pivotBody.position.y
      const angle = Math.atan2(dx, dy) // angle from straight down
      let clampedAngle = Phaser.Math.Clamp(angle, -maxAngle, maxAngle)

      // Enforce max depth without changing length.
      const maxDepthRatio = (maxBobY - t.pivotBody.position.y) / maxLen
      if (maxDepthRatio < 1) {
        const maxDepthAngle = Math.acos(Phaser.Math.Clamp(maxDepthRatio, -1, 1))
        clampedAngle = Phaser.Math.Clamp(clampedAngle, -maxDepthAngle, maxDepthAngle)
      }

      const cx = t.pivotBody.position.x + Math.sin(clampedAngle) * maxLen
      const cy = t.pivotBody.position.y + Math.cos(clampedAngle) * maxLen

      if (t.liana.length !== maxLen) t.liana.length = maxLen
      const maxDepthRatioClamped = Phaser.Math.Clamp(maxDepthRatio, -1, 1)
      const maxDepthAngle = maxDepthRatioClamped < 1 ? Math.acos(maxDepthRatioClamped) : maxAngle
      const allowedAngle = Math.min(maxAngle, maxDepthAngle)

      if (Math.abs(angle) > allowedAngle) {
        Body.setPosition(t.bob.body, { x: cx, y: cy })
        const tx = Math.cos(clampedAngle)
        const ty = -Math.sin(clampedAngle)
        const v = t.bob.body.velocity
        const tangentSpeed = v.x * tx + v.y * ty
        Body.setVelocity(t.bob.body, { x: tx * tangentSpeed, y: ty * tangentSpeed })
      }

      if (t.bob.body.position.y > maxBobY) {
        Body.setPosition(t.bob.body, { x: t.bob.body.position.x, y: maxBobY })
        Body.setVelocity(t.bob.body, { x: t.bob.body.velocity.x, y: Math.min(0, t.bob.body.velocity.y) })
      }
    }
  }

  _updateTreeMarkers(nearestTree) {
    for (const t of this.trees) {
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
    this.ropeGfx.lineStyle(2, 0x38bdf8, 0.9)

    const dashLen = 18
    for (const t of this.trees) {
      const px = t.pivotBody.position.x
      const py = t.pivotBody.position.y
      const bx = t.bob.body.position.x
      const by = t.bob.body.position.y
      const dx = bx - px
      const dy = by - py
      const r = Math.hypot(dx, dy) || 1
      const ux = dx / r
      const uy = dy / r
      this.ropeGfx.lineBetween(px, py, px + ux * dashLen, py + uy * dashLen)
    }
  }

  _driveLianas() {
    const { Body } = Phaser.Physics.Matter.Matter
    const time = this.time.now * 0.001
    const speed = 0.35
    const amp = Math.PI / 3 // 60 degrees (120–240 around straight down)

    for (const t of this.trees) {
      const theta = Math.sin(time * speed + t.phaseOffset) * amp
      const len = t.baseLen
      const px = t.pivotBody.position.x
      const py = t.pivotBody.position.y
      const x = px + Math.sin(theta) * len
      const y = py + Math.cos(theta) * len

      Body.setPosition(t.bob.body, { x, y })
      t.bob.setPosition(x, y)

      const dtheta = Math.cos(time * speed + t.phaseOffset) * amp * speed
      const vx = Math.cos(theta) * len * dtheta
      const vy = -Math.sin(theta) * len * dtheta
      Body.setVelocity(t.bob.body, { x: vx, y: vy })

      if (t.lianaSprite) {
        const dx = x - px
        const dy = y - py
        const r = Math.max(1, Math.hypot(dx, dy))
        // Align sprite with the visible blue liana line (pivot -> bob).
        const rot = Math.atan2(dy, dx) - Math.PI / 2
        t.lianaSprite.setPosition(px, py)
        t.lianaSprite.setSize(t.lianaWidth || t.lianaSprite.width, r)
        t.lianaSprite.setRotation(rot)
      }
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
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.1 },
      debug: false
    }
  }
}

// Catch any errors so they show in console (Phaser can swallow some)
window.addEventListener('error', (e) => {
  console.error('Game error:', e.error || e.message, e.filename, e.lineno, e.colno)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('Game promise rejection:', e.reason)
})

function startGame() {
  try {
    new Phaser.Game(config)
  } catch (err) {
    console.error('Phaser.Game() failed:', err)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame)
} else {
  startGame()
}
