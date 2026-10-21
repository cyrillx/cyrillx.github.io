window.Render = (function () {
  const TILE = U.TILE;
  const VIEW = U.VIEW;

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function buildMap(dungeon) {
    const cv = document.createElement('canvas');
    cv.width = dungeon.mapW;
    cv.height = dungeon.mapH;
    const c = cv.getContext('2d');

    for (let ty = 0; ty < dungeon.H; ty++) {
      for (let tx = 0; tx < dungeon.W; tx++) {
        const x = tx * TILE, y = ty * TILE;
        if (dungeon.grid[ty * dungeon.W + tx] === 0) {
          const h = U.hash2(tx, ty);
          c.fillStyle = h > 0.5 ? '#14110f' : '#100e0c';
          c.fillRect(x, y, TILE, TILE);
          const above = dungeon.isSolid(tx, ty - 1) ? false : true;
          if (above) {
            const g = c.createLinearGradient(0, y, 0, y + TILE);
            g.addColorStop(0, '#3a2f24');
            g.addColorStop(0.35, '#2a2119');
            g.addColorStop(1, '#191410');
            c.fillStyle = g;
            c.fillRect(x, y, TILE, TILE);
            c.fillStyle = 'rgba(0,0,0,0.35)';
            c.fillRect(x, y + TILE - 4, TILE, 4);
          }
          c.strokeStyle = 'rgba(0,0,0,0.5)';
          c.lineWidth = 1;
          c.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else {
          const h = U.hash2(tx * 3 + 11, ty * 5 + 7);
          const base = 42 + h * 14;
          c.fillStyle = 'rgb(' + Math.floor(base * 1.22) + ',' + Math.floor(base) + ',' + Math.floor(base * 0.86) + ')';
          c.fillRect(x, y, TILE, TILE);
          c.strokeStyle = 'rgba(0,0,0,0.22)';
          c.lineWidth = 1;
          c.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
          if (h > 0.86) {
            c.strokeStyle = 'rgba(0,0,0,0.25)';
            c.beginPath();
            c.moveTo(x + 6, y + 4);
            c.lineTo(x + 14, y + 17);
            c.lineTo(x + 9, y + 28);
            c.stroke();
          }
        }
      }
    }

    for (const p of dungeon.props) {
      const x = p.x, y = p.y;
      if (p.type === 'skull') {
        ellipse(c, x, y, 5, 4.5, '#c9c3ae');
        ellipse(c, x - 1.8, y - 1, 1.4, 1.4, '#3a3630');
        ellipse(c, x + 1.8, y - 1, 1.4, 1.4, '#3a3630');
      } else if (p.type === 'bone') {
        c.strokeStyle = '#bdb6a2'; c.lineWidth = 2.4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 7, y - 4); c.lineTo(x + 6, y + 4); c.stroke();
        c.beginPath(); c.moveTo(x - 6, y + 5); c.lineTo(x + 5, y - 5); c.stroke();
      } else if (p.type === 'barrel') {
        ellipse(c, x, y + 1, 8, 9, '#4b3421');
        ellipse(c, x, y - 2, 8, 4, '#6b4a2c');
        c.strokeStyle = '#2a1d12'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x - 7, y - 2); c.lineTo(x + 7, y - 2); c.stroke();
      } else if (p.type === 'crate') {
        c.fillStyle = '#5b4126'; c.fillRect(x - 8, y - 8, 16, 16);
        c.strokeStyle = '#38251338'; c.strokeRect(x - 8.5, y - 8.5, 17, 17);
        c.strokeStyle = '#7a5a34';
        c.beginPath(); c.moveTo(x - 8, y - 8); c.lineTo(x + 8, y + 8); c.stroke();
      } else if (p.type === 'pillar') {
        ellipse(c, x, y + 2, 10, 6, '#2b241c');
        c.fillStyle = '#4b4034'; c.fillRect(x - 8, y - 16, 16, 20);
        ellipse(c, x, y - 16, 9, 4, '#5c5044');
      } else {
        ellipse(c, x, y, 7, 5, '#3a332b');
        ellipse(c, x - 3, y - 2, 3, 2.5, '#494036');
      }
    }

    return cv;
  }

  function drawHero(ctx, h, t) {
    const bob = Math.sin(h.walkPhase * 2) * 1.6;
    ellipse(ctx, h.x, h.y + 11, 13, 5.5, 'rgba(0,0,0,0.45)');

    const swinging = h.swingTimer > 0;
    const p = swinging ? 1 - h.swingTimer / h.swingDuration : 0;

    ctx.save();
    ctx.translate(h.x, h.y + bob);

    ctx.fillStyle = '#5c2a22';
    ctx.beginPath();
    ctx.moveTo(-11, 10); ctx.lineTo(11, 10); ctx.lineTo(7, -6); ctx.lineTo(-7, -6);
    ctx.closePath(); ctx.fill();

    ellipse(ctx, 0, 0, 11, 12, '#6f7f96');
    ellipse(ctx, -3, -4, 7, 8, '#8496ae');
    ellipse(ctx, 0, -13, 8, 8, '#cfd7e2');
    ellipse(ctx, 0, -13, 5.5, 5.5, '#e6ecf3');
    ctx.fillStyle = '#2b3340';
    ctx.fillRect(-5, -14, 4, 2.5);
    ctx.fillRect(1, -14, 4, 2.5);

    ctx.save();
    ctx.rotate(h.facing);
    if (swinging) {
      const swing = U.lerp(-1.25, 1.15, p * p * (3 - 2 * p));
      ctx.rotate(swing);
    }
    ctx.fillStyle = '#4a3524';
    ctx.fillRect(6, -2, 8, 4);
    ctx.fillStyle = '#d8dee6';
    ctx.beginPath();
    ctx.moveTo(13, -2.6); ctx.lineTo(32, -1.6); ctx.lineTo(35, 0); ctx.lineTo(32, 1.6); ctx.lineTo(13, 2.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8f9aa6';
    ctx.fillRect(11, -4.5, 3, 9);
    ctx.restore();
    ctx.restore();

    if (h.hurtFlash > 0) {
      ctx.globalAlpha = Math.min(1, h.hurtFlash * 3);
      ellipse(ctx, h.x, h.y, 13, 13, '#ff6a5a');
      ctx.globalAlpha = 1;
    }
    if (h.skillCd > 0) {
      ctx.strokeStyle = 'rgba(130,195,255,0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - h.skillCd / 1.25));
      ctx.stroke();
    }
    if (h.invuln > 0) {
      ctx.strokeStyle = 'rgba(255,220,160,' + (0.25 + 0.25 * Math.sin(t * 30)) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, 17, 0, Math.PI * 2); ctx.stroke();
    }

    if (swinging) {
      const radius = 46;
      const a0 = h.facing - 1.1;
      const a1 = h.facing + 1.1;
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - p);
      const grad = ctx.createRadialGradient(h.x, h.y, 12, h.x, h.y, radius);
      grad.addColorStop(0, 'rgba(255,240,200,0)');
      grad.addColorStop(1, 'rgba(255,235,190,0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.arc(h.x, h.y, radius, a0, a1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMonster(ctx, m, t) {
    const def = m.def;
    if (m.dead) return;
    const bob = Math.sin(m.walkPhase * 2) * (m.state === 'chase' ? 2 : 0.6);
    ellipse(ctx, m.x, m.y + m.r * 0.72, m.r * 1.05, m.r * 0.42, 'rgba(0,0,0,0.42)');

    const wind = m.state === 'windup';
    const bodyColor = m.flash > 0 ? '#ffffff' : def.color;
    const darkColor = m.flash > 0 ? '#ffdddd' : def.dark;

    ctx.save();
    ctx.translate(m.x, m.y + bob);

    if (def.boss) {
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(-20, 26); ctx.quadraticCurveTo(0, -30, 20, 26);
      ctx.closePath(); ctx.fill();
    }

    ellipse(ctx, 0, 0, m.r, m.r * 1.05, bodyColor);

    if (m.type === 'skeleton') {
      ctx.strokeStyle = darkColor; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-9, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(9, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -13); ctx.stroke();
      ctx.fillStyle = '#ff4433';
      ellipse(ctx, -4, -2, 2, 2, '#ff4433');
      ellipse(ctx, 4, -2, 2, 2, '#ff4433');
      ctx.fillStyle = darkColor;
      ctx.fillRect(-5, 3, 10, 1.6);
    } else if (m.type === 'zombie') {
      ctx.fillStyle = darkColor;
      ctx.fillRect(-7, -12, 14, 5);
      ctx.fillStyle = '#ff4433';
      ellipse(ctx, -4, -2, 2, 2, '#ff4433');
      ellipse(ctx, 4, -2, 2, 2, '#ff4433');
      ctx.fillStyle = darkColor;
      ctx.fillRect(-4, 4, 8, 3);
    } else if (m.type === 'imp') {
      ctx.fillStyle = darkColor;
      ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-11, -18); ctx.lineTo(-2, -12); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, -9); ctx.lineTo(11, -18); ctx.lineTo(2, -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd24a';
      ellipse(ctx, -4, -2, 2, 2, '#ffd24a');
      ellipse(ctx, 4, -2, 2, 2, '#ffd24a');
    } else if (m.type === 'brute') {
      ctx.fillStyle = darkColor;
      ctx.fillRect(-m.r, -6, m.r * 2, 10);
      ctx.fillStyle = '#ff7733';
      ellipse(ctx, -6, -4, 2.4, 2.4, '#ff7733');
      ellipse(ctx, 6, -4, 2.4, 2.4, '#ff7733');
    } else {
      ctx.fillStyle = '#2b0d0e';
      ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(-26, -28); ctx.lineTo(-6, -20); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, -14); ctx.lineTo(26, -28); ctx.lineTo(6, -20); ctx.closePath(); ctx.fill();
      const glow = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.fillStyle = 'rgba(255,120,40,' + glow + ')';
      ellipse(ctx, -7, -4, 3.2, 3.2, 'rgba(255,120,40,' + glow + ')');
      ellipse(ctx, 7, -4, 3.2, 3.2, 'rgba(255,120,40,' + glow + ')');
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-9, 4, 18, 4);
    }

    if (wind) {
      ctx.strokeStyle = 'rgba(255,90,60,' + (0.4 + 0.5 * Math.sin(t * 40)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, m.r + 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    if (m.hp < m.maxHp) {
      const w = m.r * 2.2;
      const bx = m.x - w / 2, by = m.y - m.r - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(bx - 1, by - 1, w + 2, 5);
      ctx.fillStyle = '#8c1f1f';
      ctx.fillRect(bx, by, w, 3);
      ctx.fillStyle = def.boss ? '#ff6a3c' : '#d33b32';
      ctx.fillRect(bx, by, w * Math.max(0, m.hp / m.maxHp), 3);
    }
  }

  function drawItem(ctx, it, t) {
    const bob = Math.sin(t * 3 + it.bob) * 3;
    const x = it.x, y = it.y + bob;
    ellipse(ctx, it.x, it.y + 9, 9, 3.5, 'rgba(0,0,0,0.4)');
    if (it.kind === 'gold') {
      ctx.fillStyle = '#e8c14a';
      ellipse(ctx, x, y, 6, 4, '#e8c14a');
      ellipse(ctx, x - 2, y - 2, 3, 2, '#fff0a8');
    } else if (it.kind === 'hp') {
      ctx.fillStyle = 'rgba(220,60,60,0.85)';
      U.roundRect(ctx, x - 5, y - 7, 10, 14, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,140,0.9)';
      U.roundRect(ctx, x - 3, y - 5, 3, 6, 1.5); ctx.fill();
      ctx.fillStyle = '#c8b48a';
      ctx.fillRect(x - 2, y - 10, 4, 3);
    } else if (it.kind === 'mp') {
      ctx.fillStyle = 'rgba(60,110,220,0.85)';
      U.roundRect(ctx, x - 5, y - 7, 10, 14, 3); ctx.fill();
      ctx.fillStyle = 'rgba(150,190,255,0.9)';
      U.roundRect(ctx, x - 3, y - 5, 3, 6, 1.5); ctx.fill();
      ctx.fillStyle = '#c8b48a';
      ctx.fillRect(x - 2, y - 10, 4, 3);
    } else if (it.kind === 'sword') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.6);
      ctx.fillStyle = '#d8dee6';
      ctx.beginPath();
      ctx.moveTo(-2, -12); ctx.lineTo(2, -12); ctx.lineTo(2, 4); ctx.lineTo(0, 8); ctx.lineTo(-2, 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8f9aa6';
      ctx.fillRect(-5, 4, 10, 2.5);
      ctx.fillStyle = '#4a3524';
      ctx.fillRect(-1.5, 6.5, 3, 7);
      ctx.restore();
    } else if (it.kind === 'armor') {
      ctx.fillStyle = '#8d97a6';
      ctx.beginPath();
      ctx.moveTo(-8, -7); ctx.lineTo(-3, -10); ctx.lineTo(0, -7); ctx.lineTo(3, -10); ctx.lineTo(8, -7);
      ctx.lineTo(7, 8); ctx.lineTo(-7, 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5f6a79';
      ctx.fillRect(-1.5, -8, 3, 16);
    } else if (it.kind === 'ring') {
      ctx.strokeStyle = '#e8c14a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y + 2, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#7fd0ff';
      ellipse(ctx, x, y - 5, 3, 3, '#7fd0ff');
    }
  }

  function drawChest(ctx, ch, t) {
    ellipse(ctx, ch.x, ch.y + 10, 15, 5, 'rgba(0,0,0,0.45)');
    const w = 24, h = 16;
    ctx.fillStyle = ch.opened ? '#4a3520' : '#6b4a25';
    U.roundRect(ctx, ch.x - w / 2, ch.y - h / 2, w, h, 3); ctx.fill();
    ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 2;
    U.roundRect(ctx, ch.x - w / 2, ch.y - h / 2, w, h, 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ch.x - w / 2, ch.y); ctx.lineTo(ch.x + w / 2, ch.y);
    ctx.stroke();
    if (!ch.opened) {
      ctx.fillStyle = '#e8c14a';
      ctx.fillRect(ch.x - 2, ch.y - 3, 4, 6);
    } else {
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(ch.x - w / 2 + 2, ch.y - 2, w - 4, h - 4);
    }
  }

  function drawPortal(ctx, p, t) {
    const r = 20 + Math.sin(t * 3) * 2;
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
    if (p.open) {
      g.addColorStop(0, 'rgba(190,230,255,0.95)');
      g.addColorStop(0.5, 'rgba(70,120,255,0.55)');
      g.addColorStop(1, 'rgba(20,20,60,0)');
    } else {
      g.addColorStop(0, 'rgba(80,80,90,0.6)');
      g.addColorStop(1, 'rgba(20,20,26,0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.open ? 'rgba(160,210,255,' + (0.4 + 0.4 * Math.sin(t * 4)) + ')' : 'rgba(90,90,100,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.stroke();
  }

  function drawLight(ctx, G, cam) {
    const lc = G.lightCanvas;
    const lctx = lc.getContext('2d');
    lctx.clearRect(0, 0, VIEW.w, VIEW.h);
    lctx.fillStyle = 'rgba(0,0,0,0.74)';
    lctx.fillRect(0, 0, VIEW.w, VIEW.h);
    lctx.globalCompositeOperation = 'destination-out';

    const hero = G.hero;
    const hg = lctx.createRadialGradient(hero.x - cam.x, hero.y - cam.y, 24, hero.x - cam.x, hero.y - cam.y, 230);
    hg.addColorStop(0, 'rgba(0,0,0,1)');
    hg.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = hg;
    lctx.beginPath(); lctx.arc(hero.x - cam.x, hero.y - cam.y, 205, 0, Math.PI * 2); lctx.fill();

    for (const tor of G.dungeon.torches) {
      const tx = tor.x - cam.x, ty = tor.y - cam.y;
      if (tx < -120 || ty < -120 || tx > VIEW.w + 120 || ty > VIEW.h + 120) continue;
      const tg = lctx.createRadialGradient(tx, ty, 8, tx, ty, 145);
      tg.addColorStop(0, 'rgba(0,0,0,1)');
      tg.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = tg;
      lctx.beginPath(); lctx.arc(tx, ty, 145, 0, Math.PI * 2); lctx.fill();
    }

    if (G.dungeon.portal.open) {
      const px = G.dungeon.portal.x - cam.x, py = G.dungeon.portal.y - cam.y;
      const pg = lctx.createRadialGradient(px, py, 8, px, py, 120);
      pg.addColorStop(0, 'rgba(0,0,0,1)');
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = pg;
      lctx.beginPath(); lctx.arc(px, py, 120, 0, Math.PI * 2); lctx.fill();
    }

    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lc, 0, 0);
  }

  function drawGlow(ctx, G, cam, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const tor of G.dungeon.torches) {
      const tx = tor.x - cam.x, ty = tor.y - cam.y;
      if (tx < -60 || ty < -60 || tx > VIEW.w + 60 || ty > VIEW.h + 60) continue;
      const flick = 0.75 + 0.25 * Math.sin(t * 9 + tor.x);
      const g = ctx.createRadialGradient(tx, ty, 1, tx, ty, 46);
      g.addColorStop(0, 'rgba(255,170,70,' + (0.5 * flick) + ')');
      g.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(tx, ty, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,140,' + (0.8 * flick) + ')';
      ctx.beginPath(); ctx.arc(tx, ty - 6, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawMinimap(ctx, G) {
    const d = G.dungeon;
    const mw = 148, mh = Math.round(mw * (d.H / d.W));
    const x = VIEW.w - mw - 10, y = 10;
    ctx.fillStyle = 'rgba(8,7,6,0.78)';
    ctx.fillRect(x - 4, y - 4, mw + 8, mh + 8);
    ctx.strokeStyle = 'rgba(120,100,60,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 4.5, y - 4.5, mw + 9, mh + 9);

    const sx = mw / d.W, sy = mh / d.H;
    for (let ty = 0; ty < d.H; ty++) {
      for (let tx = 0; tx < d.W; tx++) {
        if (!d.explored[ty * d.W + tx]) continue;
        const solid = d.grid[ty * d.W + tx] === 0;
        ctx.fillStyle = solid ? 'rgba(90,80,60,0.35)' : 'rgba(190,170,120,0.55)';
        ctx.fillRect(x + tx * sx, y + ty * sy, Math.max(1, sx), Math.max(1, sy));
      }
    }
    for (const m of G.monsters) {
      if (m.dead) continue;
      ctx.fillStyle = m.def.boss ? '#ff6a3c' : '#d33b32';
      ctx.fillRect(x + (m.x / TILE) * sx - 1, y + (m.y / TILE) * sy - 1, 2.5, 2.5);
    }
    if (d.portal.open) {
      ctx.fillStyle = '#6fa8ff';
      ctx.fillRect(x + (d.portal.x / TILE) * sx - 1.5, y + (d.portal.y / TILE) * sy - 1.5, 3, 3);
    }
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x + (G.hero.x / TILE) * sx, y + (G.hero.y / TILE) * sy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function bar(ctx, x, y, w, h, pct, color, back) {
    ctx.fillStyle = back || 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * U.clamp(pct, 0, 1), h);
    ctx.strokeStyle = 'rgba(160,140,90,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function drawPanel(ctx, G) {
    const x = U.UI.x, w = U.UI.w, h = U.UI.h;
    G.uiHits.length = 0;

    const g = ctx.createLinearGradient(x, 0, x + w, h);
    g.addColorStop(0, '#1c1712');
    g.addColorStop(0.5, '#241d16');
    g.addColorStop(1, '#171310');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, h);
    ctx.strokeStyle = '#5a4622';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();

    ctx.textBaseline = 'top';
    let y = 12;

    ctx.fillStyle = '#e8c46a';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('Клинок Скверны', x + 14, y);
    y += 20;

    ctx.fillStyle = '#8d7a55';
    ctx.font = '12px Georgia, serif';
    ctx.fillText('Воин · Уровень ' + G.hero.level, x + 14, y);
    y += 20;

    const px = x + 14, pw = w - 28;
    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = '#a3947a';
    ctx.fillText('Здоровье', px, y);
    ctx.textAlign = 'right';
    ctx.fillText(Math.ceil(G.hero.hp) + ' / ' + G.hero.maxHp, px + pw, y);
    ctx.textAlign = 'left';
    y += 14;
    bar(ctx, px, y, pw, 12, G.hero.hp / G.hero.maxHp, '#a8232b');
    y += 20;

    ctx.fillStyle = '#a3947a';
    ctx.fillText('Мана', px, y);
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(G.hero.mana) + ' / ' + G.hero.maxMana, px + pw, y);
    ctx.textAlign = 'left';
    y += 14;
    bar(ctx, px, y, pw, 9, G.hero.mana / G.hero.maxMana, '#2f5bb0');
    y += 16;

    ctx.fillStyle = '#a3947a';
    ctx.fillText('Опыт', px, y);
    ctx.textAlign = 'right';
    ctx.fillText(G.hero.xp + ' / ' + G.hero.xpNext, px + pw, y);
    ctx.textAlign = 'left';
    y += 14;
    bar(ctx, px, y, pw, 6, G.hero.xp / G.hero.xpNext, '#b8912c');
    y += 18;

    const stats = [
      ['Урон', Math.round(G.hero.damage)],
      ['Защита', Math.round(G.hero.armor)],
      ['Крит', Math.round(G.hero.crit * 100) + '%'],
      ['Золото', G.hero.gold]
    ];
    ctx.font = '12px Georgia, serif';
    for (let i = 0; i < stats.length; i++) {
      const cx = px + (i % 2) * (pw / 2);
      const cy = y + Math.floor(i / 2) * 17;
      ctx.fillStyle = '#7f735c';
      ctx.fillText(stats[i][0], cx, cy);
      ctx.fillStyle = '#e0d3b0';
      ctx.fillText(String(stats[i][1]), cx + 44, cy);
    }
    y += 40;

    ctx.strokeStyle = 'rgba(120,100,60,0.35)';
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke();
    y += 10;

    const slotDefs = [
      { label: 'Зелье', sub: 'здоровья', key: 'hp', color: '#c04a4a' },
      { label: 'Зелье', sub: 'маны', key: 'mp', color: '#4a7ac0' }
    ];
    for (const s of slotDefs) {
      const sw = (pw - 8) / 2;
      const sx = px + (s.key === 'mp' ? sw + 8 : 0);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      U.roundRect(ctx, sx, y, sw, 32, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,60,0.5)';
      ctx.stroke();
      ctx.fillStyle = s.color;
      U.roundRect(ctx, sx + 6, y + 8, 9, 16, 3); ctx.fill();
      ctx.fillStyle = '#7f735c';
      ctx.font = '10px Georgia, serif';
      ctx.fillText(s.label, sx + 20, y + 4);
      ctx.fillStyle = '#cfc0a0';
      ctx.fillText(s.sub, sx + 20, y + 16);
      ctx.fillStyle = '#e8c46a';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'right';
      ctx.fillText('x' + G.hero.potions[s.key], sx + sw - 6, y + 9);
      ctx.textAlign = 'left';
      G.uiHits.push({ x: sx, y: y, w: sw, h: 32, action: 'potion', data: s.key });
      y += 36;
    }
    y += 4;

    ctx.strokeStyle = 'rgba(120,100,60,0.35)';
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke();
    y += 10;

    const eqDefs = [['sword', 'Оружие'], ['armor', 'Броня'], ['ring', 'Кольцо']];
    for (const e of eqDefs) {
      const item = G.hero.equip[e[0]];
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      U.roundRect(ctx, px, y, pw, 26, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,60,0.35)';
      ctx.stroke();
      ctx.fillStyle = '#7f735c';
      ctx.font = '11px Georgia, serif';
      ctx.fillText(e[1], px + 8, y + 7);
      ctx.font = '12px Georgia, serif';
      ctx.fillStyle = item ? '#e0d3b0' : '#5d5344';
      ctx.textAlign = 'right';
      ctx.fillText(item ? item.name : '— пусто —', px + pw - 8, y + 6);
      ctx.textAlign = 'left';
      if (item) G.uiHits.push({ x: px, y: y, w: pw, h: 26, action: 'unequip', data: e[0] });
      y += 30;
    }
    y += 6;

    ctx.fillStyle = '#8d7a55';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('Добыча (' + G.hero.bag.length + ')', px, y);
    y += 16;

    const listH = h - y - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    U.roundRect(ctx, px, y, pw, listH, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,60,0.3)';
    ctx.stroke();

    ctx.font = '12px Georgia, serif';
    let ly = y + 5;
    const maxRows = Math.floor((listH - 10) / 17);
    const bag = G.hero.bag.slice(-maxRows);
    if (G.hero.bag.length > maxRows) {
      ctx.fillStyle = '#6b6152';
      ctx.fillText('… ещё ' + (G.hero.bag.length - maxRows), px + 6, ly);
      ly += 17;
    }
    for (const it of bag) {
      ctx.fillStyle = '#d8caa6';
      ctx.fillText(it.name, px + 6, ly);
      ctx.fillStyle = '#8f9aa6';
      ctx.textAlign = 'right';
      ctx.fillText(it.kind === 'sword' ? '+' + it.power + ' урон' : it.kind === 'armor' ? '+' + it.power + ' защита' : '+' + it.power + '% крит', px + pw - 6, ly);
      ctx.textAlign = 'left';
      G.uiHits.push({ x: px, y: ly - 3, w: pw, h: 17, action: 'equip', data: it });
      ly += 17;
    }
    if (!G.hero.bag.length) {
      ctx.fillStyle = '#5d5344';
      ctx.fillText('пусто', px + 6, ly);
    }
  }

  function drawMessages(ctx, G) {
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'left';
    const n = G.messages.length;
    for (let i = 0; i < n; i++) {
      const m = G.messages[i];
      const alpha = U.clamp(m.life / 1.2, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = m.color;
      ctx.fillText(m.text, 16, VIEW.h - 22 - (n - 1 - i) * 16);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloorInfo(ctx, G) {
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(190,170,120,0.85)';
    ctx.fillText('Этаж ' + G.level + ' / ' + G.maxLevel, 16, 14);
    ctx.fillStyle = G.dungeon.portal.open ? 'rgba(143,192,255,0.9)' : 'rgba(190,170,120,0.6)';
    ctx.fillText(G.dungeon.portal.open ? 'Портал открыт — найдите его' : 'Убейте всех монстров', 16, 30);
  }

  return { buildMap, drawHero, drawMonster, drawItem, drawChest, drawPortal, drawLight, drawGlow, drawMinimap, drawPanel, drawMessages, drawFloorInfo };
})();
