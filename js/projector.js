// ProjectorClear: shared numbers, drawing helpers and 3D props for the cinema-projector chapters.
// All props are generic: no brand shapes or logos. Sources for the constants are next to each one.
import { THREE, M, box, clamp, latheX, sphere } from './kit.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// ---------------------------------------------------------------- 35 mm film
// 35 mm film: 4 perforations per frame, perforation pitch 0.187 in (4.75 mm), so 19.0 mm per frame,
// 16 frames per foot, and 24 fps = 90 ft/min (SMPTE; Wikipedia "35 mm movie film").
export const PERF_MM = 4.75;
export const FRAME_MM = 4 * PERF_MM;
export const FRAMES_PER_FOOT = 16;
// Movie projector: reels of up to 2,000 ft ≈ 22 min; the optical sound head sits 21 frames after the gate
// on 35 mm (Wikipedia "Movie projector").
export const SOUND_OFFSET_FRAMES = 21;
// A 4-slot Geneva drive (Maltese cross) turns the cross a quarter turn while the drive wheel turns 90°,
// so the film moves during 1/4 of each frame and stands still for 3/4 (Wikipedia "Geneva drive").
export const PULLDOWN = 0.25;
// Critical flicker fusion: at cinema brightness most people stop seeing flicker somewhere around 40–50 Hz
// (it rises with brightness, Ferry–Porter law; Wikipedia "Flicker fusion threshold"). We use 45 Hz as the
// middle of that band and say so.
export const FUSION_HZ = 45;

// Geneva drive with 4 slots: pin radius a, centre distance c = a·√2. Drive angle θ (0 = pin pointing at
// the cross). Returns the cross angle φ within one step (−45°…+45°) and whether the pin is engaged.
export function geneva(theta) {
  const a = 1, c = Math.SQRT2;
  let t = ((theta + Math.PI) % TAU + TAU) % TAU - Math.PI;   // −π…π
  if (Math.abs(t) > Math.PI / 4) return { engaged: false, phi: t > 0 ? Math.PI / 4 : -Math.PI / 4, frac: t > 0 ? 1 : 0 };
  const phi = Math.atan2(a * Math.sin(t), c - a * Math.cos(t));
  return { engaged: true, phi, frac: (phi + Math.PI / 4) / (Math.PI / 2) };
}
// Where the film is at time u (in frames): whole frames done plus the fraction of the current pulldown.
// The pulldown happens during the first quarter of each frame cycle.
export function filmPos(u) {
  const n = Math.floor(u), p = u - n;
  const th = -Math.PI / 4 + (p / PULLDOWN) * (Math.PI / 2);
  const g = p < PULLDOWN ? geneva(th) : { frac: 1, engaged: false };
  return { n, p, pos: n + g.frac, moving: p < PULLDOWN, theta: th };
}

// ---------------------------------------------------------------- digital cinema
// DCI containers: 2K 2048×1080, 4K 4096×2160; flat 1.85:1 uses 3996×2160 in 4K (DCI Digital Cinema System
// Specification; Wikipedia "Digital Cinema Package").
export const K4 = { w: 4096, h: 2160 };
// TI's 1.38-inch 4K DLP Cinema chip: 4096 mirrors across, about 7.5 µm apart, so the flat picture area
// is about 3996 × 7.5 µm ≈ 30 mm wide (derived from the chip diagonal; TI DLP Cinema).
export const MIRROR_UM = 7.5;
export const CHIP_FLAT_MM = (3996 * MIRROR_UM) / 1000;
// DMD mirrors tilt to about +12° (on) and −12° (off) and can flip thousands of times a second
// (Wikipedia "Digital micromirror device"; TI patents describe ±12° on/off states).
export const TILT = 12;
// DCI reference screen luminance: 48 cd/m² = 14 fL at the centre of the screen (DCI specification, SMPTE RP 431-2).
export const DCI_FL = 14;
export const FT2_PER_M2 = 10.7639;

// ---------------------------------------------------------------- drawing helpers
export const COL = { amber: '#ffb547', hot: '#ffd166', cyan: '#8ef0ff', pink: '#ff7ab6', green: '#7be08c', bad: '#ff5a8a', soft: 'rgba(255,255,255,.6)', text: '#e8eef8', red: '#ff5a4a', g: '#5fe08a', b: '#6f8cff', violet: '#c49bff' };
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; rrect(g, 0, 0, w, h, 18); g.fill(); }
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function title(g, s, sub = '', y = 40) {
  g.textAlign = 'left'; g.fillStyle = COL.text; g.font = 'bold 28px sans-serif'; g.fillText(s, 24, y);
  if (sub) { g.font = '19px sans-serif'; g.fillStyle = COL.soft; g.fillText(sub, 24, y + 28); }
}
export function text(g, s, x, y, { font = '18px sans-serif', col = 'rgba(255,255,255,.82)', align = 'left' } = {}) { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
export function wrap(g, s, x, y, maxW, lh = 24, opts = {}) {
  g.font = opts.font || '18px sans-serif';
  let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { text(g, line, x, y, opts); line = w; y += lh; } else line = t; }
  if (line) text(g, line, x, y, opts);
  return y + lh;
}

// A flat board in the scene that you redraw when its data changes.
export function board(parent, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = (...a) => { draw(g, pxW, pxH, ...a); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
  mesh.renderOrder = 5;
  mesh.position.set(...pos); parent.add(mesh);
  return { tex, redraw, canvas: c, mesh };
}

// The generic "film" everyone watches in this box: a dusk sky, hills and a bouncing ball.
// k is time in seconds of the film; eye shifts the ball for a stereo pair (−1 left, +1 right, 0 none).
export function drawScene(g, w, h, k = 0, { eye = 0, dim = 1, label = '' } = {}) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#26306b'); sky.addColorStop(0.55, '#e0766a'); sky.addColorStop(1, '#ffc27a');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(w * 0.74, h * 0.52, h * 0.12, 0, TAU); g.fill();
  g.fillStyle = '#3a2a4a'; g.beginPath(); g.moveTo(0, h * 0.72);
  for (let x = 0; x <= w; x += w / 24) g.lineTo(x, h * (0.7 - 0.07 * Math.sin(x / w * 7 + 1) - 0.04 * Math.sin(x / w * 17)));
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = '#1d1830'; g.fillRect(0, h * 0.86, w, h * 0.14);
  // the bouncing ball
  const ph = (k * 0.9) % 1, bx = w * (0.18 + 0.55 * ((k * 0.23) % 1)), by = h * (0.84 - 0.5 * 4 * ph * (1 - ph));
  const r = h * 0.075, dx = eye * w * 0.035;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(bx, h * 0.87, r * 1.1, r * 0.25, 0, 0, TAU); g.fill();
  const bg = g.createRadialGradient(bx + dx - r * 0.3, by - r * 0.3, r * 0.1, bx + dx, by, r);
  bg.addColorStop(0, '#ffe08a'); bg.addColorStop(1, '#ff6a2a');
  g.fillStyle = bg; g.beginPath(); g.arc(bx + dx, by, r, 0, TAU); g.fill();
  if (dim < 1) { g.fillStyle = `rgba(0,0,0,${1 - dim})`; g.fillRect(0, 0, w, h); }
  if (label) text(g, label, 14, h - 14, { font: `bold ${Math.round(h * 0.07)}px sans-serif`, col: 'rgba(255,255,255,.8)' });
}

// ---------------------------------------------------------------- stage helpers
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage, hide minor labels and move the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y0 = -0.12) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? y0 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards beside the model on a wide screen; somewhere else in the tall reel video.
export function reelBoards(list) {
  const r = inReel();
  list.forEach(([b, pos, scale = 1, rot = [0, 0, 0]]) => {
    if (!b.home) b.home = { p: b.mesh.position.clone(), r: b.mesh.rotation.clone(), s: b.mesh.scale.x };
    if (r) { b.mesh.position.set(...pos); b.mesh.scale.setScalar(scale); b.mesh.rotation.set(...rot); }
    else { b.mesh.position.copy(b.home.p); b.mesh.scale.setScalar(b.home.s); b.mesh.rotation.copy(b.home.r); }
  });
}
export function pressSeg(value, label = null) {
  const segs = [...document.querySelectorAll('#panel .ctl-seg')].filter((el) => !label || el.querySelector('label')?.textContent === label);
  for (const el of segs) { const b = [...el.querySelectorAll('.seg button')].find((x) => x.dataset.v === String(value)); if (b) { b.click(); return true; } }
  return false;
}

// A rod you can re-aim every frame.
export function stick(r, mat, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  m.between = (a, b) => { A.set(...a); B.set(...b); const L = A.distanceTo(B); m.visible = L > 1e-3; if (!m.visible) return; m.position.copy(A).add(B).multiplyScalar(0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(Y, B.sub(A).normalize()); };
  return m;
}

// A cone of light from a point to a rectangle (4 corners), redrawn each frame.
export function lightCone(color = 0xfff1c9, opacity = 0.12) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
  g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
  const m = new THREE.Mesh(g, M.ghost(color, opacity, { blending: THREE.AdditiveBlending }));
  m.frustumCulled = false;
  m.set = (apex, corners) => { const p = g.attributes.position; p.setXYZ(0, ...apex); corners.forEach((c, i) => p.setXYZ(i + 1, ...c)); p.needsUpdate = true; g.computeBoundingSphere(); };
  return m;
}

// A faceless seated/standing person, feet at origin, facing −z. About 1.75 m tall.
export function makePerson({ shirt = 0x3b6fd8, skin = 0xd9c3a5, sit = false } = {}) {
  const g = new THREE.Group();
  const legs = box(0.34, sit ? 0.45 : 0.85, 0.2, M.matte(0x2b3242)); legs.position.y = sit ? 0.23 : 0.43; g.add(legs);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 12), M.matte(shirt)); body.position.y = (sit ? 0.45 : 0.85) + 0.36; g.add(body);
  const head = sphere(0.12, M.matte(skin)); head.position.y = body.position.y + 0.48; g.add(head);
  g.head = head;
  return g;
}

// Seats in stepped rows. Returns the group; rows go from z0 towards +z.
export function makeSeats({ rows = 10, cols = 14, pitch = 1.0, rise = 0.25, width = 0.6, z0 = 0, col = 0x8a2433 } = {}) {
  const g = new THREE.Group(), n = rows * cols, o = new THREE.Object3D();
  const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(width * 0.85, 0.45, 0.5), M.matte(col), n);
  const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(width * 0.85, 0.6, 0.1), M.matte(col), n);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const step = box(cols * width + 1, rise, pitch, M.matte(0x2a2330)); step.position.set(0, r * rise - rise / 2, z0 + r * pitch); if (r > 0) g.add(step);
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * width;
      o.position.set(x, r * rise + 0.23, z0 + r * pitch); o.updateMatrix(); seats.setMatrixAt(i, o.matrix);
      o.position.set(x, r * rise + 0.6, z0 + r * pitch + 0.28); o.updateMatrix(); backs.setMatrixAt(i++, o.matrix);
    }
  }
  seats.castShadow = backs.castShadow = true;
  g.add(seats, backs);
  return g;
}

// A generic digital cinema projector: a boxy body with vents and a lens barrel on the front (−z).
export function makeDigitalProjector({ w = 0.75, h = 0.55, d = 1.1, col = 0x3a3f4b } = {}) {
  const g = new THREE.Group();
  const body = box(w, h, d, M.plastic(col, { roughness: 0.6 })); body.position.y = h / 2; g.add(body);
  for (let i = 0; i < 5; i++) { const v = box(0.02, h * 0.5, 0.02, M.matte(0x16181d)); v.position.set(w / 2 + 0.005, h / 2, -d / 2 + 0.25 + i * 0.12); g.add(v); }
  const lens = latheX([[0, 0.1], [0.05, 0.11], [0.25, 0.1], [0.3, 0.085]], M.metal(0x2a2d33));
  lens.rotation.y = Math.PI / 2; lens.position.set(-w * 0.15, h * 0.5, -d / 2); g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), M.glow(0xcfe8ff)); glass.position.set(-w * 0.15, h * 0.5, -d / 2 - 0.301); glass.rotation.y = Math.PI; g.add(glass);
  const stand = box(w * 0.9, 0.4, d * 0.8, M.matte(0x22252c)); stand.position.y = -0.2; g.add(stand);
  g.lensTip = new THREE.Vector3(-w * 0.15, h * 0.5, -d / 2 - 0.3);
  g.body = body;
  return g;
}

export { THREE, M, box, clamp, latheX, sphere };
