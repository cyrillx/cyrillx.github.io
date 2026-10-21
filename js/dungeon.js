window.Dungeon = (function () {
  const TILE = U.TILE;
  const W = 64;
  const H = 44;

  function idx(tx, ty) { return ty * W + tx; }

  function carveRoom(grid, r) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) grid[idx(x, y)] = 1;
    }
  }

  function carveCorridor(grid, x1, y1, x2, y2) {
    let x = x1, y = y1;
    while (x !== x2) { grid[idx(x, y)] = 1; x += x2 > x ? 1 : -1; }
    while (y !== y2) { grid[idx(x, y)] = 1; y += y2 > y ? 1 : -1; }
    grid[idx(x, y)] = 1;
  }

  function overlaps(a, b, pad) {
    return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
  }

  function generate(level, isBoss) {
    const grid = new Uint8Array(W * H);
    const rooms = [];

    if (isBoss) {
      const big = { x: 18, y: 12, w: 28, h: 18, cx: 31, cy: 20 };
      for (let i = 0; i < 4; i++) {
        const a = { x: 2 + i * 15, y: 2 + (i % 2) * 34, w: 8, h: 7, cx: 5 + i * 15, cy: 5 + (i % 2) * 34 };
        carveRoom(grid, a);
        carveCorridor(grid, a.cx, a.cy, big.cx, big.cy);
        rooms.push(a);
      }
      carveRoom(grid, big);
      rooms.push(big);
    } else {
      const tries = 120;
      for (let i = 0; i < tries; i++) {
        const w = U.randInt(6, 14);
        const h = U.randInt(5, 10);
        const x = U.randInt(1, W - w - 2);
        const y = U.randInt(1, H - h - 2);
        const r = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
        let ok = true;
        for (const o of rooms) { if (overlaps(r, o, 2)) { ok = false; break; } }
        if (!ok) continue;
        rooms.push(r);
        carveRoom(grid, r);
        if (rooms.length > 1) {
          const p = rooms[rooms.length - 2];
          carveCorridor(grid, p.cx, p.cy, r.cx, r.cy);
        }
      }
    }

    const floorTiles = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[idx(x, y)] === 1) floorTiles.push({ x, y });
      }
    }

    const props = [];
    const propTypes = ['bone', 'skull', 'barrel', 'crate', 'rubble', 'pillar'];
    for (const t of floorTiles) {
      if (U.hash2(t.x * 7 + level, t.y * 13) > 0.93) {
        props.push({ type: U.pick(propTypes), tx: t.x, ty: t.y, x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 });
      }
    }

    const torches = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (grid[idx(x, y)] !== 0) continue;
        const nearFloor = grid[idx(x - 1, y)] === 1 || grid[idx(x + 1, y)] === 1 || grid[idx(x, y - 1)] === 1 || grid[idx(x, y + 1)] === 1;
        if (!nearFloor) continue;
        if (U.hash2(x * 31 + level * 7, y * 17) > 0.82) {
          torches.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, tx: x, ty: y });
        }
      }
    }

    const startRoom = rooms[0];
    const start = { x: startRoom.cx * TILE + TILE / 2, y: startRoom.cy * TILE + TILE / 2, tx: startRoom.cx, ty: startRoom.cy };

    let portalRoom = rooms[rooms.length - 1];
    let best = -1;
    for (const r of rooms) {
      const d = Math.hypot(r.cx - start.tx, r.cy - start.ty);
      if (d > best) { best = d; portalRoom = r; }
    }
    const portal = { x: portalRoom.cx * TILE + TILE / 2, y: portalRoom.cy * TILE + TILE / 2, tx: portalRoom.cx, ty: portalRoom.cy, open: false };

    const chests = [];
    const chestCount = U.randInt(1, 3);
    for (let i = 0; i < chestCount; i++) {
      const r = U.pick(rooms);
      chests.push({ x: r.x * TILE + TILE / 2, y: r.y * TILE + TILE / 2, hp: 20, opened: false, r: 14 });
    }

    return {
      W, H, grid, rooms, floorTiles, props, torches, start, portal, chests, level,
      mapW: W * TILE, mapH: H * TILE,
      isSolid(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
        return grid[idx(tx, ty)] === 0;
      },
      blocked(x, y, r) {
        const minx = Math.floor((x - r) / TILE), maxx = Math.floor((x + r) / TILE);
        const miny = Math.floor((y - r) / TILE), maxy = Math.floor((y + r) / TILE);
        for (let ty = miny; ty <= maxy; ty++) {
          for (let tx = minx; tx <= maxx; tx++) {
            if (this.isSolid(tx, ty)) return true;
          }
        }
        return false;
      }
    };
  }

  function computeFlow(dungeon, tx, ty) {
    const dist = new Int16Array(dungeon.W * dungeon.H).fill(-1);
    if (dungeon.isSolid(tx, ty)) return dist;
    const queue = new Int32Array(dungeon.W * dungeon.H);
    let head = 0, tail = 0;
    queue[tail++] = idx(tx, ty);
    dist[idx(tx, ty)] = 0;
    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % dungeon.W;
      const cy = (cur / dungeon.W) | 0;
      const d = dist[cur];
      for (let i = 0; i < 4; i++) {
        const nx = cx + (i === 0 ? 1 : i === 1 ? -1 : 0);
        const ny = cy + (i === 2 ? 1 : i === 3 ? -1 : 0);
        if (dungeon.isSolid(nx, ny)) continue;
        const ni = idx(nx, ny);
        if (dist[ni] !== -1) continue;
        dist[ni] = d + 1;
        queue[tail++] = ni;
      }
    }
    return dist;
  }

  function lineClear(dungeon, x1, y1, x2, y2) {
    let cx = Math.floor(x1 / TILE), cy = Math.floor(y1 / TILE);
    const ex = Math.floor(x2 / TILE), ey = Math.floor(y2 / TILE);
    const dx = Math.abs(ex - cx), dy = Math.abs(ey - cy);
    const sx = cx < ex ? 1 : -1, sy = cy < ey ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while (guard++ < 500) {
      if (cx === ex && cy === ey) return true;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
      if (cx === ex && cy === ey) return true;
      if (dungeon.isSolid(cx, cy)) return false;
    }
    return false;
  }

  return { generate, computeFlow, lineClear, TILE, W, H };
})();
