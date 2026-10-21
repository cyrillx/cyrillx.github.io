window.Entities = (function () {
  const TILE = U.TILE;

  const MONSTER_TYPES = {
    skeleton: { hp: 34, dmg: 7, speed: 92, r: 11, range: 30, cd: 1.0, aggro: 320, xp: 6, gold: [3, 9], color: '#d8d2c0', dark: '#8e8776', windup: 0.32, name: 'Скелет' },
    zombie: { hp: 62, dmg: 11, speed: 58, r: 13, range: 32, cd: 1.4, aggro: 290, xp: 9, gold: [4, 12], color: '#6f8f5a', dark: '#3c5233', windup: 0.42, name: 'Зомби' },
    imp: { hp: 28, dmg: 8, speed: 74, r: 10, range: 165, cd: 2.1, aggro: 340, xp: 8, gold: [5, 14], color: '#c25b3a', dark: '#6d2b1c', windup: 0.3, ranged: true, name: 'Бес' },
    brute: { hp: 140, dmg: 18, speed: 46, r: 17, range: 40, cd: 1.9, aggro: 330, xp: 17, gold: [12, 26], color: '#7a5f8c', dark: '#3f3049', windup: 0.55, name: 'Громовик' },
    lord: { hp: 760, dmg: 26, speed: 54, r: 26, range: 56, cd: 1.5, aggro: 9999, xp: 150, gold: [120, 220], color: '#a8262a', dark: '#4a0f12', windup: 0.5, boss: true, name: 'Повелитель Скверны' }
  };

  class Hero {
    constructor(x, y) {
      this.x = x; this.y = y; this.r = 12;
      this.facing = -Math.PI / 2;
      this.level = 1;
      this.xp = 0;
      this.baseDamage = 9;
      this.baseArmor = 0;
      this.speed = 138;
      this.critChance = 0.06;
      this.attackSpeed = 1.0;
      this.swingTimer = 0;
      this.swingDuration = 0.3;
      this.swingHits = new Set();
      this.attackCd = 0;
      this.skillCd = 0;
      this.manaCost = 20;
      this.hurtFlash = 0;
      this.invuln = 0;
      this.walkPhase = 0;
      this.dead = false;
      this.equip = { sword: null, armor: null, ring: null };
      this.bag = [];
      this.potions = { hp: 2, mp: 1 };
      this.gold = 0;
      this.kills = 0;
      this.maxHp = 100;
      this.maxMana = 40;
      this.hp = 100;
      this.mana = 40;
    }

    get damage() { return this.baseDamage + (this.equip.sword ? this.equip.sword.power : 0); }
    get armor() { return this.baseArmor + (this.equip.armor ? this.equip.armor.power : 0); }
    get crit() { return this.critChance + (this.equip.ring ? this.equip.ring.power * 0.01 : 0); }
    get xpNext() { return Math.round(60 * Math.pow(this.level, 1.42)); }

    refreshStats() {
      const newMaxHp = 100 + (this.level - 1) * 20 + (this.equip.armor ? this.equip.armor.power * 5 : 0);
      const newMaxMana = 40 + (this.level - 1) * 6 + (this.equip.ring ? this.equip.ring.power * 2 : 0);
      this.hp = U.clamp(this.hp + (newMaxHp - this.maxHp), 0, newMaxHp);
      this.mana = U.clamp(this.mana + (newMaxMana - this.maxMana), 0, newMaxMana);
      this.maxHp = newMaxHp;
      this.maxMana = newMaxMana;
    }

    takeDamage(amount, G) {
      if (this.dead || this.invuln > 0) return;
      const reduced = amount * (100 / (100 + this.armor * 9));
      this.hp -= reduced;
      this.hurtFlash = 0.35;
      this.invuln = 0.28;
      G.shake(4);
      G.fx.text(this.x, this.y - 22, '-' + Math.round(reduced), '#ff6a5a');
      Sfx.hurt();
      if (this.hp <= 0) { this.hp = 0; this.dead = true; Sfx.die(); }
    }

    heal(amount) {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + amount);
      return this.hp - before;
    }

    gainXp(amount, G) {
      this.xp += amount;
      while (this.xp >= this.xpNext) {
        this.xp -= this.xpNext;
        this.level++;
        this.baseDamage += 3;
        this.baseArmor += 1;
        this.attackSpeed += 0.04;
        this.refreshStats();
        this.hp = this.maxHp;
        this.mana = this.maxMana;
        G.message('Уровень ' + this.level + '! Сила растёт.', '#ffd76a');
        G.fx.text(this.x, this.y - 34, 'УРОВЕНЬ ' + this.level, '#ffd76a', 1.6);
        Sfx.levelUp();
      }
    }
  }

  class Monster {
    constructor(type, x, y, level) {
      const t = MONSTER_TYPES[type];
      const scale = 1 + 0.3 * (level - 1);
      this.type = type;
      this.def = t;
      this.x = x; this.y = y; this.r = t.r;
      this.maxHp = Math.round(t.hp * scale);
      this.hp = this.maxHp;
      this.damage = t.dmg * (1 + 0.17 * (level - 1));
      this.speed = t.speed;
      this.xp = Math.round(t.xp * (1 + 0.25 * (level - 1)));
      this.gold = U.randInt(t.gold[0], t.gold[1]) + level * U.randInt(1, 4);
      this.state = 'idle';
      this.aggro = false;
      this.attackTimer = 0;
      this.cooldown = U.rand(0.2, 1.2);
      this.flash = 0;
      this.walkPhase = U.rand(0, 6);
      this.facing = 0;
      this.dead = false;
      this.deathTimer = 0;
      this.knockX = 0;
      this.knockY = 0;
      this.spawnAnim = 0.45;
      this.hitFlashT = 0;
    }

    get alive() { return !this.dead; }

    hurt(amount, G, fromX, fromY) {
      if (this.dead) return;
      this.hp -= amount;
      this.flash = 0.18;
      this.aggro = true;
      const ang = Math.atan2(this.y - fromY, this.x - fromX);
      const kb = this.def.boss ? 2 : this.type === 'brute' ? 4 : 9;
      this.knockX += Math.cos(ang) * kb;
      this.knockY += Math.sin(ang) * kb;
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        this.deathTimer = 0;
      }
    }
  }

  class Projectile {
    constructor(x, y, angle, speed, dmg, owner, color) {
      this.x = x; this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.dmg = dmg;
      this.owner = owner;
      this.color = color || '#ff9a3c';
      this.r = 6;
      this.life = 3.2;
      this.dead = false;
    }
  }

  class Item {
    constructor(kind, x, y, data) {
      this.kind = kind;
      this.x = x; this.y = y;
      this.data = data || {};
      this.dead = false;
      this.bob = U.rand(0, 6.28);
      this.t = 0;
    }
  }

  return { Hero, Monster, Projectile, Item, MONSTER_TYPES };
})();
