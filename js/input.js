window.Input = (function () {
  const keys = Object.create(null);
  const pressed = Object.create(null);
  const mouse = { x: 0, y: 0, down: false, clicked: false, inside: false, right: false, rightClicked: false };
  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  const virtual = { attack: false, potion: false, skill: false };
  let canvas = null;

  function keyDown(code) { return !!keys[code]; }
  function wasPressed(code) {
    if (pressed[code]) { pressed[code] = false; return true; }
    return false;
  }

  function updateMouse(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
    mouse.inside = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= canvas.width && mouse.y <= canvas.height;
  }

  function init(cv) {
    canvas = cv;

    window.addEventListener('keydown', (e) => {
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'KeyR'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

    canvas.addEventListener('mousemove', updateMouse);
    canvas.addEventListener('mouseenter', () => { mouse.inside = true; });
    canvas.addEventListener('mouseleave', () => { mouse.inside = false; mouse.down = false; });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
      if (e.button === 2) { mouse.right = true; mouse.rightClicked = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) mouse.down = false;
      if (e.button === 2) mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const half = r.width * 0.45;
      if (x < half && !stick.active) {
        stick.active = true;
        stick.id = e.pointerId;
        stick.ox = e.clientX;
        stick.oy = e.clientY;
        stick.dx = 0;
        stick.dy = 0;
      } else {
        virtual.attack = true;
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('pointermove', (e) => {
      if (!stick.active || e.pointerId !== stick.id) return;
      const max = 70;
      let dx = e.clientX - stick.ox;
      let dy = e.clientY - stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      stick.dx = dx / max;
      stick.dy = dy / max;
    });

    const endPointer = (e) => {
      if (stick.active && e.pointerId === stick.id) {
        stick.active = false; stick.id = null; stick.dx = 0; stick.dy = 0;
      }
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    const attackBtn = document.getElementById('btn-attack');
    const potionBtn = document.getElementById('btn-potion');
    const skillBtn = document.getElementById('btn-skill');
    if (attackBtn) {
      attackBtn.addEventListener('pointerdown', (e) => { virtual.attack = true; e.preventDefault(); });
    }
    if (potionBtn) {
      potionBtn.addEventListener('pointerdown', (e) => { virtual.potion = true; e.preventDefault(); });
    }
    if (skillBtn) {
      skillBtn.addEventListener('pointerdown', (e) => { virtual.skill = true; e.preventDefault(); });
    }
  }

  function moveVector() {
    let x = 0, y = 0;
    if (keyDown('KeyA') || keyDown('ArrowLeft')) x -= 1;
    if (keyDown('KeyD') || keyDown('ArrowRight')) x += 1;
    if (keyDown('KeyW') || keyDown('ArrowUp')) y -= 1;
    if (keyDown('KeyS') || keyDown('ArrowDown')) y += 1;
    if (stick.active) { x += stick.dx; y += stick.dy; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  function attackHeld() {
    return mouse.down || virtual.attack || keyDown('Space');
  }

  function endFrame() {
    mouse.clicked = false;
    mouse.rightClicked = false;
    virtual.attack = false;
    virtual.potion = false;
    virtual.skill = false;
  }

  return { init, keyDown, wasPressed, mouse, moveVector, attackHeld, endFrame, virtual };
})();
