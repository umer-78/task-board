import * as THREE from 'three';

/**
 * The page's 3D backdrop: a tilted board with the same three columns and the
 * same number of cards in each as the board you are editing. Move a task and a
 * card lifts out of one column and lands in the other; add or clear tasks and
 * cards drop in or fade away. It sits in the empty space below the board,
 * pauses when the tab is hidden and holds still for reduced motion.
 */
export type Counts = [number, number, number];

export interface BoardScene {
  setCounts(counts: Counts): void;
  dispose(): void;
}

const TINT = {
  light: ['#7c3aed', '#0284c7', '#16a34a'],
  dark: ['#a78bfa', '#38bdf8', '#4ade80'],
};
const COLUMN_X = [-2.55, 0, 2.55];
const TRAY_W = 2.3;
const TRAY_H = 4.6;
const CARD_W = 1.95;
const CARD_H = 0.46;
const SLOTS = 7; // cards shown per column before they start to pack closer

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

interface Card {
  mesh: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>;
  col: number;
  slot: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hop: number; // 1 while flying between columns, easing to 0
  life: number; // grows to 1 on arrival, shrinks to 0 when leaving
  leaving: boolean;
  seed: number;
}

export function createBoardScene(host: HTMLElement, initial: Counts): BoardScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);
  camera.position.set(0, 0, 18);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-3, 5, 8);
  scene.add(sun);

  const root = new THREE.Group();
  const board = new THREE.Group();
  board.rotation.set(-1.05, 0, 0.1);
  root.add(board);
  scene.add(root);

  // ── The three columns ──
  const trayShape = roundedRect(TRAY_W, TRAY_H, 0.22);
  const trayGeo = new THREE.ShapeGeometry(trayShape, 12);
  const edgeGeo = new THREE.BufferGeometry().setFromPoints(trayShape.getPoints(12).map((p) => new THREE.Vector3(p.x, p.y, 0)));
  const chipGeo = new THREE.ShapeGeometry(roundedRect(0.9, 0.16, 0.08), 6);
  const trays = COLUMN_X.map((x) => {
    const fill = new THREE.Mesh(trayGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    const edge = new THREE.LineLoop(edgeGeo, new THREE.LineBasicMaterial({ transparent: true }));
    const chip = new THREE.Mesh(chipGeo, new THREE.MeshBasicMaterial({ transparent: true }));
    fill.position.x = edge.position.x = x;
    chip.position.set(x - TRAY_W / 2 + 0.62, TRAY_H / 2 - 0.26, 0.01);
    board.add(fill, edge, chip);
    return { fill, edge, chip };
  });

  // ── Cards ──
  const cardGeo = new THREE.ExtrudeGeometry(roundedRect(CARD_W, CARD_H, 0.09), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 6 });
  const cards: Card[] = [];
  const slotY = (slot: number, n: number) => {
    const step = n > SLOTS ? (TRAY_H - 0.95) / (n - 1) : 0.56;
    return TRAY_H / 2 - 0.66 - slot * step;
  };
  const home = (c: Card, n: number) => new THREE.Vector3(COLUMN_X[c.col]!, slotY(c.slot, n), 0.05 + c.slot * 0.004);
  const makeCard = (col: number, fromAbove: boolean): Card => {
    const mesh = new THREE.Mesh(cardGeo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.08, transparent: true }));
    board.add(mesh);
    const card: Card = { mesh, col, slot: 0, pos: new THREE.Vector3(COLUMN_X[col]!, TRAY_H / 2 + (fromAbove ? 1.2 : 0), fromAbove ? 2.4 : 0.05), vel: new THREE.Vector3(), hop: 0, life: fromAbove ? 0 : 1, leaving: false, seed: Math.random() * 6.28 };
    cards.push(card);
    return card;
  };

  const tint = () => (dark.matches ? TINT.dark : TINT.light);
  const paint = () => {
    const t = tint();
    trays.forEach((tray, i) => {
      tray.fill.material.color.set(t[i]!);
      tray.fill.material.opacity = dark.matches ? 0.09 : 0.07;
      tray.edge.material.color.set(t[i]!);
      tray.edge.material.opacity = dark.matches ? 0.45 : 0.4;
      tray.chip.material.color.set(t[i]!);
      tray.chip.material.opacity = 0.9;
    });
    for (const c of cards) c.mesh.material.color.set(t[c.col]!).lerp(new THREE.Color(dark.matches ? '#1e232d' : '#ffffff'), dark.matches ? 0.55 : 0.72);
  };

  const columnsOf = () => [0, 1, 2].map((col) => cards.filter((c) => !c.leaving && c.col === col));
  const reslot = () => {
    for (const list of columnsOf()) list.forEach((c, i) => { c.slot = i; });
    paint();
  };

  /** Move the fewest cards needed to match the new counts: across first, then in or out. */
  const setCounts = (next: Counts) => {
    const cols = columnsOf();
    const spare: Card[] = [];
    cols.forEach((list, col) => { while (list.length > Math.max(0, next[col] ?? 0)) spare.push(list.pop()!); });
    cols.forEach((list, col) => {
      while (list.length < (next[col] ?? 0)) {
        const moved = spare.shift();
        if (moved) { moved.col = col; moved.hop = 1; list.push(moved); } else list.push(makeCard(col, true));
      }
    });
    for (const gone of spare) gone.leaving = true;
    reslot();
    wake();
  };

  // ── Layout: fit the board's projected outline into the empty space below the page's board ──
  const corners = COLUMN_X.flatMap((x) => [-1, 1].flatMap((sx) => [-1, 1].map((sy) => new THREE.Vector3(x + (sx * TRAY_W) / 2, (sy * TRAY_H) / 2, 0))));
  const v = new THREE.Vector3();
  const outline = (w: number, h: number) => {
    root.updateMatrixWorld(true);
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    for (const c of corners) {
      v.copy(c).applyMatrix4(board.matrixWorld).project(camera);
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  const layout = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const wide = w >= 900;
    const box = wide ? { x: 0.36 * w, y: 0.72 * h, w: 0.58 * w, h: 0.28 * h - 14 } : { x: 0.05 * w, y: 0.74 * h, w: 0.9 * w, h: 0.26 * h - 12 };
    const pxPerUnit = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z);
    board.rotation.set(-1.05, 0, 0.1);
    root.position.set(0, 0, 0);
    root.scale.setScalar(1);
    // perspective makes size depend on position a little, so fit twice
    for (let i = 0; i < 2; i++) {
      const o = outline(w, h);
      root.scale.multiplyScalar(Math.min(box.w / o.w, box.h / o.h));
      const p = outline(w, h);
      root.position.x += (box.x + box.w / 2 - p.cx) / pxPerUnit;
      root.position.y -= (box.y + box.h / 2 - p.cy) / pxPerUnit;
    }
    host.classList.toggle('narrow', !wide);
    wake();
  };

  // ── Pointer parallax ──
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    tilt.tx = (e.clientX / window.innerWidth - 0.5) * 0.3;
    tilt.ty = (e.clientY / window.innerHeight - 0.5) * 0.18;
    wake();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // ── Frame ──
  let raf = 0;
  let last = 0;
  let time = 0;
  let shown = false;
  const frame = (now: number) => {
    raf = 0;
    if (document.hidden) return;
    const calm = still.matches;
    const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 1 / 60;
    last = now;
    if (!calm) time += dt;
    const k = calm ? 1 : 1 - Math.pow(0.002, dt);
    tilt.x += (tilt.tx - tilt.x) * k;
    tilt.y += (tilt.ty - tilt.y) * k;
    board.rotation.set(-1.05 + tilt.y, tilt.x, 0.1 + Math.sin(time * 0.35) * 0.02);
    const counts = columnsOf().map((l) => l.length);
    let moving = false;
    for (const c of [...cards]) {
      const target = home(c, counts[c.col] ?? 0);
      if (c.leaving) {
        c.life = calm ? 0 : Math.max(0, c.life - dt * 3);
        if (c.life <= 0) {
          board.remove(c.mesh);
          c.mesh.material.dispose();
          cards.splice(cards.indexOf(c), 1);
          continue;
        }
      } else c.life = calm ? 1 : Math.min(1, c.life + dt * 2.5);
      if (calm) { c.pos.copy(target); c.vel.set(0, 0, 0); c.hop = 0; } else {
        // a damped spring toward its slot, lifted off the board while it changes column
        c.vel.addScaledVector(target.clone().sub(c.pos), 60 * dt).multiplyScalar(Math.max(0, 1 - 11 * dt));
        c.pos.addScaledVector(c.vel, dt);
        c.hop = Math.max(0, c.hop - dt * 1.4);
      }
      const bob = calm ? 0 : Math.sin(time * 1.3 + c.seed) * 0.015;
      c.mesh.position.set(c.pos.x, c.pos.y, c.pos.z + Math.sin(c.hop * Math.PI) * 1.4 + bob);
      c.mesh.scale.setScalar(0.6 + 0.4 * c.life);
      c.mesh.material.opacity = c.life;
      if (c.vel.lengthSq() > 1e-4 || c.hop > 0 || c.leaving || c.life < 1) moving = true;
    }
    renderer.render(scene, camera);
    if (!shown) { shown = true; host.classList.add('on'); }
    // the gentle sway keeps it running; with reduced motion it draws only when something changes
    if (!calm || moving) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const onVisibility = () => { last = 0; if (!document.hidden) wake(); };
  const onTheme = () => { paint(); wake(); };
  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', onVisibility);
  dark.addEventListener('change', onTheme);
  still.addEventListener('change', wake);

  initial.forEach((n, col) => { for (let i = 0; i < n; i++) makeCard(col, false); });
  reslot();
  layout();

  return {
    setCounts,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', layout);
      document.removeEventListener('visibilitychange', onVisibility);
      dark.removeEventListener('change', onTheme);
      still.removeEventListener('change', wake);
      for (const c of cards) c.mesh.material.dispose();
      trays.forEach((t) => { t.fill.material.dispose(); t.edge.material.dispose(); t.chip.material.dispose(); });
      [trayGeo, edgeGeo, chipGeo, cardGeo].forEach((g) => g.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
