window.Game = (function () {
  const TILE = U.TILE;
  const VIEW = U.VIEW;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const titleScreen = document.getElementById('title-screen');
  const endScreen = document.getElementById('end-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const overlay = document.getElementById('overlay');

  const MAX_LEVEL = 5;

  const G = {
    state: 'title',
    hero: null,
    dungeon: null,
    mapCanvas: null,
    lightCanvas: document.createElement('canvas'),
    monsters: [],
    items: [],
    projectiles: [],
    messages: [],
    uiHits: [],
    level: 1,
    maxLevel: MAX_LEVEL,
    time: 0,
    shakeAmt: 0,
    cam: { x: 0, y: 0 },
    flow: null,
    flowTimer: 0,
    exploredTimer: 0,
    killedTotal: 0,
    fx: null,
    message: null,
    shake: null
  };

  const fx = {
    particles: [],
    texts: [],
    corpses: [],
    decals: [],
    rings: [],
    ring(x, y, maxR, color) {
      fx.rings.push({ x, y, r: 8, maxR, life: 0.42, max: 0.42, color: color || '#9fd8ff' });
    },
    text(x, y, txt, color, scale) {
      fx.texts.push({ x, y, txt, color: color || '#fff', life: 0.95, max: 0.95, scale: scale || 1, vy: -34 });
    },
    blood(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 40 + Math.random() * 190;
        fx.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.35 + Math.random() * 0.4, max: 0.75,
          size: 1.6 + Math.random() * 2.6, color: color || '#8e1b18', drag: 0.86, gravity: 120
        });
      }
      if (fx.decals.length < 160) fx.decals.push({ x, y, r: 6 + Math.random() * 9, a: 0.35 + Math.random() * 0.25 });
    },
    spark(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 60 + Math.random() * 200;
        fx.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.2 + Math.random() * 0.3, max: 0.5,
          size: 1.2 + Math.random() * 1.8, color: color || '#ffd88a', drag: 0.9, gravity: 40
        });
      }
    },
    dust(x, y) {
      fx.particles.push({
        x: x + (Math.random() - 0.5) * 10, y: y + 8,
        vx: (Math.random() - 0.5) * 24, vy: -10 - Math.random() * 14,
        life: 0.4, max: 0.4, size: 2.6, color: 'rgba(150,130,100,0.4)', drag: 0.9, gravity: -10
      });
    },
    update(dt) {
      for (let i = fx.particles.length - 1; i >= 0; i--) {
        const p = fx.particles[i];
        p.life -= dt;
        if (p.life <= 0) { fx.particles.splice(i, 1); continue; }
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = fx.texts.length - 1; i >= 0; i--) {
        const t = fx.texts[i];
        t.life -= dt;
        if (t.life <= 0) { fx.texts.splice(i, 1); continue; }
        t.y += t.vy * dt;
        t.vy *= 0.94;
      }
      for (let i = fx.corpses.length - 1; i >= 0; i--) {
        const c = fx.corpses[i];
        c.life -= dt;
        if (c.life <= 0) fx.corpses.splice(i, 1);
      }
      for (let i = fx.rings.length - 1; i >= 0; i--) {
        const r = fx.rings[i];
        r.life -= dt;
        if (r.life <= 0) { fx.rings.splice(i, 1); continue; }
        const p = 1 - r.life / r.max;
        r.r = U.lerp(10, r.maxR, p);
      }
    }
  };
  G.fx = fx;

  G.message = function (text, color) {
    G.messages.push({ text, color: color || '#cfc0a0', life: 5 });
    while (G.messages.length > 5) G.messages.shift();
  };

  G.shake = function (v) {
    G.shakeAmt = Math.min(14, G.shakeAmt + v);
  };

  function gearItem(kind, tier) {
    if (kind === 'sword') {
      const power = 2 + Math.round(tier * U.rand(1.3, 2.4));
      return { kind, power, name: 'Клинок +' + power };
    }
    if (kind === 'armor') {
      const power = 1 + Math.round(tier * U.rand(0.6, 1.3));
      return { kind, power, name: 'Кольчуга +' + power };
    }
    const power = 1 + Math.round(tier * U.rand(0.4, 0.9));
    return { kind, power, name: 'Кольцо +' + power };
  }

  function spawnMonsters(level) {
    const d = G.dungeon;
    const weights = [['skeleton', 6]];
    if (level >= 2) { weights.push(['zombie', 3], ['imp', 2]); }
    if (level >= 3) weights.push(['brute', 2]);
    if (level >= 4) weights.push(['zombie', 3], ['imp', 3]);

    const total = 8 + level * 3;
    const pool = [];
    for (const w of weights) for (let i = 0; i < w[1]; i++) pool.push(w[0]);
    U.shuffle(pool);

    for (let i = 0; i < total; i++) {
      const spot = findSpot(280);
      if (!spot) continue;
      const type = pool[i % pool.length];
      G.monsters.push(new Entities.Monster(type, spot.x, spot.y, level));
    }

    if (d.isBoss) {
      const big = d.rooms[d.rooms.length - 1];
      const boss = new Entities.Monster('lord', big.cx * TILE + TILE / 2, big.cy * TILE + TILE / 2, level);
      G.monsters.push(boss);
      G.message('Повелитель Скверны пробуждён!', '#ff6a5a');
      Sfx.boss();
    }
  }

  function findSpot(minDist) {
    const d = G.dungeon;
    const tiles = d.floorTiles;
    for (let tries = 0; tries < 400; tries++) {
      const t = tiles[Math.floor(Math.random() * tiles.length)];
      const x = t.x * TILE + TILE / 2, y = t.y * TILE + TILE / 2;
      if (Math.hypot(x - G.hero.x, y - G.hero.y) < minDist) continue;
      if (d.blocked(x, y, 14)) continue;
      return { x, y };
    }
    return null;
  }

  function scatterLoot() {
    const d = G.dungeon;
    const n = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const t = d.floorTiles[Math.floor(Math.random() * d.floorTiles.length)];
      const x = t.x * TILE + TILE / 2, y = t.y * TILE + TILE / 2;
      if (Math.random() < 0.55) G.items.push(new Entities.Item('gold', x, y, { amount: U.randInt(4, 14) }));
      else if (Math.random() < 0.6) G.items.push(new Entities.Item('hp', x, y));
      else G.items.push(new Entities.Item('mp', x, y));
    }
  }

  function setupLevel(n) {
    G.level = n;
    G.dungeon = Dungeon.generate(n, n === G.maxLevel);
    G.dungeon.explored = new Uint8Array(G.dungeon.W * G.dungeon.H);
    G.mapCanvas = Render.buildMap(G.dungeon);
    G.monsters.length = 0;
    G.items.length = 0;
    G.projectiles.length = 0;
    G.messages.length = 0;
    fx.particles.length = 0;
    fx.texts.length = 0;
    fx.corpses.length = 0;
    fx.decals.length = 0;

    G.hero.x = G.dungeon.start.x;
    G.hero.y = G.dungeon.start.y;
    G.hero.invuln = 0.8;

    spawnMonsters(n);
    scatterLoot();
    G.flow = Dungeon.computeFlow(G.dungeon, G.dungeon.start.tx, G.dungeon.start.ty);
    G.flowTimer = 0;
    updateCamera();
    G.message('Этаж ' + n + '. Очистите подземелье.', '#d8c79a');
  }

  function startNewGame() {
    G.hero = new Entities.Hero(0, 0);
    G.killedTotal = 0;
    setupLevel(1);
    G.state = 'play';
    overlay.classList.add('hidden');
    endScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    titleScreen.classList.add('hidden');
  }

  function endGame(win) {
    G.state = win ? 'win' : 'dead';
    document.getElementById('end-title').textContent = win ? 'Скверна повержена!' : 'Вы погибли';
    document.getElementById('end-text').innerHTML =
      'Этаж: <b>' + G.level + '</b> из ' + G.maxLevel + '<br>' +
      'Убито монстров: <b>' + G.killedTotal + '</b><br>' +
      'Уровень героя: <b>' + G.hero.level + '</b><br>' +
      'Золото: <b>' + G.hero.gold + '</b>';
    endScreen.classList.remove('hidden');
    overlay.classList.remove('hidden');
    if (win) Sfx.levelUp();
  }

  function descend() {
    if (G.level >= G.maxLevel) { endGame(true); return; }
    Sfx.portal();
    G.message('Спускаемся глубже...', '#8fc0ff');
    setupLevel(G.level + 1);
  }

  function killMonster(m) {
    G.killedTotal++;
    G.hero.gainXp(m.xp, G);
    fx.corpses.push({ x: m.x, y: m.y, r: m.r, color: m.def.dark, life: 14, max: 14, type: m.type });
    fx.blood(m.x, m.y, 16, m.def.dark);
    Sfx.die();
    G.shake(3);

    G.items.push(new Entities.Item('gold', m.x, m.y, { amount: m.gold }));
    if (Math.random() < 0.17) G.items.push(new Entities.Item('hp', m.x + 14, m.y + 6));
    if (Math.random() < 0.13) G.items.push(new Entities.Item('mp', m.x - 14, m.y + 6));
    const roll = Math.random();
    const tier = Math.min(6, G.level + U.randInt(0, 1));
    if (roll < 0.10) G.items.push(new Entities.Item('sword', m.x, m.y - 16, gearItem('sword', tier)));
    else if (roll < 0.17) G.items.push(new Entities.Item('armor', m.x + 16, m.y, gearItem('armor', tier)));
    else if (roll < 0.22) G.items.push(new Entities.Item('ring', m.x - 16, m.y, gearItem('ring', tier)));

    if (m.def.boss) {
      G.message('Повелитель Скверны повержен!', '#ffd76a');
      G.shake(14);
    }

    if (G.monsters.every((x) => x.dead) && !G.dungeon.portal.open) {
      G.dungeon.portal.open = true;
      G.message('Портал открыт! Спускайтесь вниз.', '#8fc0ff');
      Sfx.portal();
    }
  }

  function chaseVector(m, hero) {
    const d = G.dungeon;
    if (Dungeon.lineClear(d, m.x, m.y, hero.x, hero.y)) {
      return { x: hero.x - m.x, y: hero.y - m.y };
    }
    const flow = G.flow;
    const cx = Math.floor(m.x / TILE), cy = Math.floor(m.y / TILE);
    let best = null, bestD = Infinity;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = cx + ox, ny = cy + oy;
        if (d.isSolid(nx, ny)) continue;
        if (ox && oy && (d.isSolid(cx + ox, cy) || d.isSolid(cx, cy + oy))) continue;
        const v = flow[ny * d.W + nx];
        if (v < 0) continue;
        if (v < bestD) { bestD = v; best = { x: nx * TILE + TILE / 2, y: ny * TILE + TILE / 2 }; }
      }
    }
    if (best) return { x: best.x - m.x, y: best.y - m.y };
    return { x: hero.x - m.x, y: hero.y - m.y };
  }

  function moveMonster(m, vx, vy, dt, speedMul) {
    const sp = m.speed * (speedMul || 1);
    const len = Math.hypot(vx, vy);
    if (len < 0.0001) return;
    const nx = m.x + (vx / len) * sp * dt;
    const ny = m.y + (vy / len) * sp * dt;
    const d = G.dungeon;
    if (!d.blocked(nx, m.y, m.r)) m.x = nx;
    if (!d.blocked(m.x, ny, m.r)) m.y = ny;
    m.walkPhase += dt * (2 + sp * 0.05);
    m.facing = Math.atan2(vy, vx);
  }

  function updateMonster(m, dt) {
    if (m.dead) return;
    m.flash = Math.max(0, m.flash - dt);
    m.spawnAnim = Math.max(0, m.spawnAnim - dt);
    const hero = G.hero;

    if (m.knockX || m.knockY) {
      const kx = m.knockX * dt * 60, ky = m.knockY * dt * 60;
      m.knockX *= 0.84; m.knockY *= 0.84;
      if (!G.dungeon.blocked(m.x + kx, m.y, m.r)) m.x += kx;
      if (!G.dungeon.blocked(m.x, m.y + ky, m.r)) m.y += ky;
    }

    const d = U.dist(m, hero);
    if (!m.aggro && d < m.def.aggro && !hero.dead) m.aggro = true;

    if (m.state === 'windup') {
      m.attackTimer -= dt;
      if (m.attackTimer <= 0) {
        m.state = 'chase';
        m.cooldown = m.def.cd;
        if (d <= m.def.range + m.r + 14) {
          hero.takeDamage(m.damage, G);
          const ang = U.angleTo(m, hero);
          fx.blood(hero.x, hero.y, 8, '#8e1b18');
          fx.spark(hero.x + Math.cos(ang) * 12, hero.y + Math.sin(ang) * 12, 6, '#ff8a5a');
        }
      }
      return;
    }

    if (!m.aggro) {
      m.walkPhase += dt * 0.6;
      return;
    }
    if (hero.dead) return;

    if (m.def.ranged) {
      m.cooldown -= dt;
      if (d < m.def.range * 0.6) {
        moveMonster(m, m.x - hero.x, m.y - hero.y, dt, 1);
      } else if (d > m.def.range) {
        moveMonster(m, hero.x - m.x, hero.y - m.y, dt, 1);
      } else {
        const ang = U.angleTo(m, hero) + Math.PI / 2;
        moveMonster(m, Math.cos(ang), Math.sin(ang), dt, 0.55);
        m.facing = U.angleTo(m, hero);
      }
      if (m.cooldown <= 0 && Dungeon.lineClear(G.dungeon, m.x, m.y, hero.x, hero.y)) {
        m.cooldown = m.def.cd;
        const ang = U.angleTo(m, hero);
        G.projectiles.push(new Entities.Projectile(m.x + Math.cos(ang) * m.r, m.y + Math.sin(ang) * m.r, ang, 230, m.damage, m, '#ff9a3c'));
        fx.spark(m.x + Math.cos(ang) * 14, m.y + Math.sin(ang) * 14, 5, '#ffb060');
        Sfx.swing();
      }
      return;
    }

    if (d <= m.def.range + m.r && m.cooldown <= 0) {
      m.state = 'windup';
      m.attackTimer = m.def.windup;
      m.facing = U.angleTo(m, hero);
      return;
    }

    const v = chaseVector(m, hero);
    moveMonster(m, v.x, v.y, dt, 1);
  }

  function updateHero(dt) {
    const hero = G.hero;
    if (hero.dead) return;

    hero.attackCd = Math.max(0, hero.attackCd - dt);
    hero.skillCd = Math.max(0, hero.skillCd - dt);
    hero.hurtFlash = Math.max(0, hero.hurtFlash - dt);
    hero.invuln = Math.max(0, hero.invuln - dt);
    hero.mana = Math.min(hero.maxMana, hero.mana + 4.5 * dt);

    const mv = Input.moveVector();
    const speed = hero.speed * (hero.swingTimer > 0 ? 0.55 : 1);
    if (mv.x || mv.y) {
      const nx = hero.x + mv.x * speed * dt;
      const ny = hero.y + mv.y * speed * dt;
      if (!G.dungeon.blocked(nx, hero.y, hero.r)) hero.x = nx;
      if (!G.dungeon.blocked(hero.x, ny, hero.r)) hero.y = ny;
      hero.walkPhase += dt * 11;
      if (Math.random() < dt * 6) fx.dust(hero.x, hero.y);
    }

    if (Input.mouse.inside && Input.mouse.x < VIEW.w) {
      hero.facing = Math.atan2(Input.mouse.y - (hero.y - G.cam.y), Input.mouse.x - (hero.x - G.cam.x));
    }

    if ((Input.attackHeld() || Input.virtual.attack) && hero.attackCd <= 0 && hero.swingTimer <= 0) {
      hero.swingTimer = hero.swingDuration;
      hero.attackCd = 0.42 / hero.attackSpeed;
      hero.swingHits.clear();
      Sfx.swing();
    }

    if (hero.swingTimer > 0) {
      hero.swingTimer -= dt;
      const p = 1 - hero.swingTimer / hero.swingDuration;
      if (p >= 0.16 && p <= 0.78) {
        for (const m of G.monsters) {
          if (m.dead || hero.swingHits.has(m)) continue;
          const dd = U.dist(hero, m);
          if (dd > hero.r + m.r + 34) continue;
          const ang = U.angleTo(hero, m);
          if (Math.abs(U.angleDiff(hero.facing, ang)) > 1.15) continue;
          hero.swingHits.add(m);
          const crit = Math.random() < hero.crit;
          let dmg = hero.damage * (0.88 + Math.random() * 0.28);
          if (crit) dmg *= 1.85;
          m.hurt(dmg, G, hero.x, hero.y);
          fx.text(m.x, m.y - m.r - 8, String(Math.round(dmg)), crit ? '#ffd76a' : '#ffffff', crit ? 1.35 : 1);
          fx.blood(m.x, m.y, crit ? 16 : 9, m.def.dark);
          fx.spark(m.x, m.y, crit ? 8 : 4, crit ? '#ffd76a' : '#ffffff');
          Sfx.hit();
          if (crit) Sfx.crit();
          G.shake(crit ? 5 : 2);
          if (m.dead) killMonster(m);
        }
        for (const ch of G.dungeon.chests) {
          if (ch.opened || hero.swingHits.has(ch)) continue;
          const dd = U.dist(hero, ch);
          if (dd > hero.r + ch.r + 30) continue;
          const ang = U.angleTo(hero, ch);
          if (Math.abs(U.angleDiff(hero.facing, ang)) > 1.15) continue;
          hero.swingHits.add(ch);
          ch.opened = true;
          Sfx.chest();
          G.shake(4);
          fx.spark(ch.x, ch.y - 6, 16, '#ffd76a');
          const tier = Math.min(6, G.level + 1);
          G.items.push(new Entities.Item('gold', ch.x - 12, ch.y, { amount: U.randInt(20, 45) + G.level * 6 }));
          G.items.push(new Entities.Item('hp', ch.x + 12, ch.y));
          if (Math.random() < 0.65) G.items.push(new Entities.Item(gearItem('sword', tier).kind, ch.x, ch.y - 14, gearItem('sword', tier)));
          else G.items.push(new Entities.Item(gearItem('armor', tier).kind, ch.x, ch.y - 14, gearItem('armor', tier)));
          G.message('Сундук открыт!', '#ffd76a');
        }
      }
      if (hero.swingTimer <= 0) hero.swingTimer = 0;
    }

    if (Input.wasPressed('Digit1')) usePotion('hp');
    if (Input.wasPressed('Digit2')) usePotion('mp');
    if (Input.virtual.potion) usePotion('hp');
    if (Input.wasPressed('KeyQ') || Input.mouse.rightClicked || Input.virtual.skill) castWhirlwind();
  }

  function castWhirlwind() {
    const hero = G.hero;
    if (hero.skillCd > 0) return;
    if (hero.mana < hero.manaCost) {
      G.message('Недостаточно маны!', '#8fc0ff');
      return;
    }
    hero.mana -= hero.manaCost;
    hero.skillCd = 1.25;
    fx.ring(hero.x, hero.y, 96, '#9fd8ff');
    fx.ring(hero.x, hero.y, 70, '#ffffff');
    Sfx.whirl();
    G.shake(4);

    for (const m of G.monsters) {
      if (m.dead) continue;
      const d = U.dist(hero, m);
      if (d > 96 + m.r) continue;
      const crit = Math.random() < hero.crit * 0.6;
      let dmg = hero.damage * 0.72 * (0.85 + Math.random() * 0.3);
      if (crit) dmg *= 1.6;
      m.hurt(dmg, G, hero.x, hero.y);
      fx.text(m.x, m.y - m.r - 8, String(Math.round(dmg)), crit ? '#ffd76a' : '#cfe8ff', crit ? 1.3 : 1);
      fx.blood(m.x, m.y, 6, m.def.dark);
      if (m.dead) killMonster(m);
    }
  }

  function usePotion(kind) {
    const hero = G.hero;
    if (hero.potions[kind] <= 0) {
      G.message('Зелья не осталось!', '#c88');
      return;
    }
    if (kind === 'hp') {
      if (hero.hp >= hero.maxHp) return;
      hero.potions.hp--;
      const healed = hero.heal(hero.maxHp * 0.42);
      G.message('Выпито зелье здоровья (+' + Math.round(healed) + ')', '#ff8f8f');
      fx.text(hero.x, hero.y - 30, '+' + Math.round(healed), '#7fff9a', 1.2);
      fx.spark(hero.x, hero.y, 12, '#7fff9a');
    } else {
      if (hero.mana >= hero.maxMana) return;
      hero.potions.mp--;
      const before = hero.mana;
      hero.mana = Math.min(hero.maxMana, hero.mana + hero.maxMana * 0.6);
      G.message('Выпито зелье маны (+' + Math.round(hero.mana - before) + ')', '#8fc0ff');
      fx.text(hero.x, hero.y - 30, '+' + Math.round(hero.mana - before), '#8fc0ff', 1.2);
      fx.spark(hero.x, hero.y, 12, '#8fc0ff');
    }
    Sfx.potion();
  }

  function equipItem(item) {
    const hero = G.hero;
    const cur = hero.equip[item.kind];
    if (cur && cur.power >= item.power) {
      G.message(cur.name + ' лучше — оставьте его.', '#c8b48a');
      return;
    }
    const idx = hero.bag.indexOf(item);
    if (idx >= 0) hero.bag.splice(idx, 1);
    hero.equip[item.kind] = item;
    if (cur) hero.bag.push(cur);
    hero.refreshStats();
    G.message('Экипировано: ' + item.name, '#ffd76a');
    Sfx.pickup();
  }

  function unequipSlot(kind) {
    const hero = G.hero;
    const item = hero.equip[kind];
    if (!item) return;
    hero.equip[kind] = null;
    hero.bag.push(item);
    hero.refreshStats();
    G.message('Снято: ' + item.name, '#c8b48a');
  }

  function updateItems(dt) {
    const hero = G.hero;
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i];
      it.t += dt;
      if (U.dist(it, hero) > 30) continue;
      if (it.kind === 'gold') {
        hero.gold += it.data.amount || 0;
        G.items.splice(i, 1);
        fx.spark(it.x, it.y, 6, '#ffd76a');
        Sfx.coin();
      } else if (it.kind === 'hp' || it.kind === 'mp') {
        hero.potions[it.kind]++;
        G.items.splice(i, 1);
        G.message('Найдено зелье ' + (it.kind === 'hp' ? 'здоровья' : 'маны'), '#cfc0a0');
        Sfx.pickup();
      } else {
        hero.bag.push(it.data);
        G.items.splice(i, 1);
        G.message('Найдено: ' + it.data.name + ' (экипируйте в панели)', '#d8c79a');
        Sfx.pickup();
      }
    }
  }

  function updateProjectiles(dt) {
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const p = G.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0 || G.dungeon.blocked(p.x, p.y, 3)) { G.projectiles.splice(i, 1); continue; }
      if (!G.hero.dead && U.dist(p, G.hero) < p.r + G.hero.r) {
        G.hero.takeDamage(p.dmg, G);
        fx.spark(p.x, p.y, 8, p.color);
        G.projectiles.splice(i, 1);
      }
    }
  }

  function updateCamera() {
    const hero = G.hero;
    G.cam.x = U.clamp(hero.x - VIEW.w / 2, 0, G.dungeon.mapW - VIEW.w);
    G.cam.y = U.clamp(hero.y - VIEW.h / 2, 0, G.dungeon.mapH - VIEW.h);
  }

  function update(dt) {
    G.time += dt;
    if (G.state !== 'play') return;

    G.shakeAmt *= Math.pow(0.86, dt * 60);
    if (G.shakeAmt < 0.05) G.shakeAmt = 0;

    for (let i = G.messages.length - 1; i >= 0; i--) {
      G.messages[i].life -= dt;
      if (G.messages[i].life <= 0) G.messages.splice(i, 1);
    }

    updateHero(dt);
    for (const m of G.monsters) updateMonster(m, dt);
    updateProjectiles(dt);
    updateItems(dt);
    fx.update(dt);

    G.flowTimer -= dt;
    if (G.flowTimer <= 0) {
      G.flowTimer = 0.22;
      G.flow = Dungeon.computeFlow(G.dungeon, Math.floor(G.hero.x / TILE), Math.floor(G.hero.y / TILE));
    }

    G.exploredTimer -= dt;
    if (G.exploredTimer <= 0) {
      G.exploredTimer = 0.2;
      const d = G.dungeon;
      const cx = Math.floor(G.hero.x / TILE), cy = Math.floor(G.hero.y / TILE);
      for (let ty = cy - 9; ty <= cy + 9; ty++) {
        for (let tx = cx - 9; tx <= cx + 9; tx++) {
          if (tx < 0 || ty < 0 || tx >= d.W || ty >= d.H) continue;
          if (Dungeon.lineClear(d, G.hero.x, G.hero.y, tx * TILE + TILE / 2, ty * TILE + TILE / 2)) {
            d.explored[ty * d.W + tx] = 1;
          }
        }
      }
    }

    if (G.dungeon.portal.open && U.dist(G.hero, G.dungeon.portal) < 26) descend();

    updateCamera();

    if (G.hero.dead && G.state === 'play') endGame(false);
  }

  function drawWorld() {
    const shakeX = G.shakeAmt ? (Math.random() - 0.5) * G.shakeAmt : 0;
    const shakeY = G.shakeAmt ? (Math.random() - 0.5) * G.shakeAmt : 0;
    const camX = Math.round(G.cam.x) - shakeX;
    const camY = Math.round(G.cam.y) - shakeY;

    ctx.save();
    ctx.translate(-camX, -camY);

    ctx.drawImage(G.mapCanvas, 0, 0);

    for (const dec of fx.decals) {
      ctx.globalAlpha = dec.a;
      ctx.fillStyle = '#5c1412';
      ctx.beginPath();
      ctx.ellipse(dec.x, dec.y, dec.r, dec.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const c of fx.corpses) {
      ctx.globalAlpha = U.clamp(c.life / 3, 0, 0.85);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + c.r * 0.4, c.r * 1.05, c.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const ch of G.dungeon.chests) Render.drawChest(ctx, ch, G.time);
    Render.drawPortal(ctx, G.dungeon.portal, G.time);

    for (const it of G.items) Render.drawItem(ctx, it, G.time);

    for (const m of G.monsters) {
      if (m.dead) continue;
      if (m.spawnAnim > 0) {
        ctx.globalAlpha = 1 - m.spawnAnim / 0.45;
      }
      Render.drawMonster(ctx, m, G.time);
      ctx.globalAlpha = 1;
    }

    for (const p of G.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.r * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    Render.drawHero(ctx, G.hero, G.time);

    for (const ring of fx.rings) {
      const a = U.clamp(ring.life / ring.max, 0, 1);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3 + a * 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const part of fx.particles) {
      ctx.globalAlpha = U.clamp(part.life / part.max, 0, 1);
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x - part.size / 2, part.y - part.size / 2, part.size, part.size);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    for (const t of fx.texts) {
      ctx.globalAlpha = U.clamp(t.life / t.max, 0, 1);
      ctx.font = 'bold ' + Math.round(13 * t.scale) + 'px Georgia, serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(t.txt, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    ctx.restore();

    Render.drawLight(ctx, G, { x: camX, y: camY });
    Render.drawGlow(ctx, G, { x: camX, y: camY }, G.time);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!G.dungeon) return;
    drawWorld();
    Render.drawFloorInfo(ctx, G);
    Render.drawMinimap(ctx, G);
    Render.drawPanel(ctx, G);
    Render.drawMessages(ctx, G);
  }

  function handleClicks() {
    if (!Input.mouse.clicked) return;
    const mx = Input.mouse.x, my = Input.mouse.y;
    for (const hit of G.uiHits) {
      if (mx >= hit.x && mx <= hit.x + hit.w && my >= hit.y && my <= hit.y + hit.h) {
        if (hit.action === 'potion') usePotion(hit.data);
        else if (hit.action === 'equip') equipItem(hit.data);
        else if (hit.action === 'unequip') unequipSlot(hit.data);
        return;
      }
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (Input.wasPressed('Escape')) {
      if (G.state === 'play') { G.state = 'pause'; pauseScreen.classList.remove('hidden'); overlay.classList.remove('hidden'); }
      else if (G.state === 'pause') { G.state = 'play'; pauseScreen.classList.add('hidden'); overlay.classList.add('hidden'); }
    }
    if ((G.state === 'dead' || G.state === 'win') && Input.wasPressed('KeyR')) startNewGame();
    if (G.state === 'title' && Input.wasPressed('Enter')) startNewGame();

    if (G.state === 'play') handleClicks();
    update(dt);
    draw();
    Input.endFrame();
    requestAnimationFrame(loop);
  }

  function init() {
    G.lightCanvas.width = VIEW.w;
    G.lightCanvas.height = VIEW.h;
    Input.init(canvas);
    if ('ontouchstart' in window) document.body.classList.add('touch');

    document.getElementById('btn-start').addEventListener('click', startNewGame);
    document.getElementById('btn-again').addEventListener('click', startNewGame);
    overlay.addEventListener('click', (e) => {
      if (G.state === 'title' && e.target === overlay) startNewGame();
    });

    G.hero = new Entities.Hero(64, 64);
    G.dungeon = Dungeon.generate(1, false);
    G.dungeon.explored = new Uint8Array(G.dungeon.W * G.dungeon.H);
    G.mapCanvas = Render.buildMap(G.dungeon);
    G.hero.x = G.dungeon.start.x;
    G.hero.y = G.dungeon.start.y;
    updateCamera();

    requestAnimationFrame(loop);
  }

  window.addEventListener('DOMContentLoaded', init);

  return G;
})();
