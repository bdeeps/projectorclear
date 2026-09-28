// Chapter 3: lens, throw and screen. How big the picture is, how bright it looks, and why a tilted
// projector makes a keystone.
//  - Thin-lens throw: picture width W = D × (chip width) / f, with the 4K flat picture area about 30 mm wide
//    (3996 mirrors × 7.5 µm, TI 1.38-inch DLP Cinema chip). Throw ratio = D / W = f / chip width.
//  - Screen brightness in foot-lamberts: fL = lumens × gain / area (ft²), before port-glass and lens losses.
//  - DCI reference: 48 cd/m² = 14 fL at screen centre; theatres may be within ±10.2 cd/m² (about ±3 fL)
//    (DCI Digital Cinema System Specification, SMPTE RP 431-2).
//  - Screen gain: matte white about 1.0 with very wide viewing; silver (for polarised 3D) about 2.2–2.4 but
//    narrow, with gain halving roughly 20–25° off axis (typical maker data; the curves here are illustrative).
//  - Keystone: a projector tilted down at a vertical screen throws a trapezoid; lens shift moves the picture
//    without tilting, so it stays rectangular.
import { THREE, M, box, clamp } from '../kit.js';
import { CHIP_FLAT_MM, DCI_FL, FT2_PER_M2, board, panelBg, title, text, COL, drawScene, fitNarrow, reelBoards, lightCone, makeSeats, makePerson, makeDigitalProjector } from '../projector.js';

const ASPECT = 1.85;                   // DCI flat
const SCREENS = {
  white: { name: 'Matte white', gain: 1.0, half: 70 },
  silver: { name: 'Silver (3D)', gain: 2.4, half: 22 },
};
const gainAt = (type, deg) => { const S = SCREENS[type]; return type === 'white' ? S.gain * Math.max(0.35, Math.cos((deg * Math.PI) / 180) ** 0.25) : S.gain * Math.exp(-Math.LN2 * (deg / S.half) ** 2); };
export function geometry(s) {
  const W = (s.throw * CHIP_FLAT_MM) / s.f, H = W / ASPECT;
  const area = W * H, ft2 = area * FT2_PER_M2;
  const fL = (s.lumens * SCREENS[s.screen].gain) / ft2;
  return { W, H, area, ft2, fL, ratio: s.f / CHIP_FLAT_MM };
}
const SEATS = { centre: { x: 0, frac: 0.55, name: 'middle of the hall' }, side: { x: 1, frac: 0.25, name: 'front, far side' }, back: { x: 0.6, frac: 0.9, name: 'back row, side' } };

export default {
  id: 'screen',
  short: 'Lens and screen',
  title: 'Throw, screen size and brightness',
  subtitle: 'The lens decides how big the picture is. The screen and the lamp decide how bright it looks.',
  view: { pos: [-29, 12, 19], target: [0, 5.5, 12] },
  learn: `<p>The projector sits in a <b>booth</b> at the back, often 20 to 30 metres from the screen. That distance is the <b>throw</b>. The lens spreads the tiny picture from the chip (about <b>3 cm wide</b>) into a picture metres wide. A short <b>focal length</b> spreads it more. The rule is simple: <b>picture width = throw × chip width ÷ focal length</b>. Lenses and refraction are explained in CameraClear and SnellClear.</p>
    <p>The booth is usually higher than the screen. If you just <b>tilt</b> the projector down, light to the bottom of the picture travels further than light to the top, so the bottom comes out wider: a <b>keystone</b>. Cinemas avoid it with <b>lens shift</b>, sliding the lens up or down so the projector can stay level.</p>
    <p>Brightness is measured in <b>foot-lamberts</b> (fL). The DCI standard asks for <b>14 fL</b> (48 candela per square metre) in the middle of the screen. The same light spread over a bigger screen is dimmer, so big screens need more <b>lumens</b>. A <b>silver screen</b> bounces light back in a narrow beam: about <b>2.4×</b> brighter in the middle, but dim from the side seats. <b>Matte white</b> looks the same from almost everywhere. The tiny holes in the screen for the speakers are in FilmSoundClear.</p>
    <p class="tip"><b>Try it:</b> change the lens and watch the picture grow. Raise the booth, then switch between tilt and lens shift. Pick the silver screen and move to a side seat.</p>`,
  terms: [
    { t: 'Throw', d: 'The distance from the projector lens to the screen.' },
    { t: 'Throw ratio', d: 'Throw divided by picture width. A long lens gives a high throw ratio and a smaller picture.' },
    { t: 'Keystone', d: 'A picture shaped like a trapezoid, because the projector is tilted at the screen. The far edge comes out wider.' },
    { t: 'Lens shift', d: 'Sliding the lens sideways or up and down, so the picture moves without tilting the projector.' },
    { t: 'Foot-lambert', d: 'A unit of screen brightness. 1 fL is about 3.43 candela per square metre; cinemas aim for 14 fL.' },
    { t: 'Screen gain', d: 'How much brighter a screen looks straight on than a perfect matte white one. Silver is about 2.4.' },
    { t: 'Lumen', d: 'The total light a projector puts out. Big cinema projectors give tens of thousands.' },
  ],
  defaults: { f: 55, throw: 22, booth: 3.5, aim: 'shift', screen: 'white', lumens: 13000, seat: 'centre' },
  controls: [
    { key: 'f', type: 'range', label: 'Lens focal length', min: 30, max: 100, step: 1, ends: ['30 mm wide', '100 mm long'], fmt: (v, s) => `${Math.round(v)} mm · picture ${geometry(s).W.toFixed(1)} m wide` },
    { key: 'throw', type: 'range', label: 'Throw (booth to screen)', min: 12, max: 34, step: 0.5, ends: ['12 m', '34 m'], fmt: (v) => `${v.toFixed(1)} m` },
    { key: 'booth', type: 'range', label: 'Booth height above the screen centre', min: 0, max: 8, step: 0.1, ends: ['level', '8 m up'], fmt: (v) => `${v.toFixed(1)} m` },
    { key: 'aim', type: 'seg', label: 'Point the picture by', options: [{ v: 'tilt', label: 'Tilting' }, { v: 'shift', label: 'Lens shift' }] },
    { key: 'screen', type: 'seg', label: 'Screen', options: Object.entries(SCREENS).map(([v, m]) => ({ v, label: m.name })), fmt: (v) => `gain ${SCREENS[v].gain}` },
    { key: 'lumens', type: 'log', label: 'Projector light output', min: 5000, max: 75000, ends: ['5,000 lm', '75,000 lm'], fmt: (v) => `${(Math.round(v / 500) * 500).toLocaleString('en-US')} lm` },
    { key: 'seat', type: 'seg', label: 'Your seat', options: Object.entries(SEATS).map(([v, m]) => ({ v, label: m.name })) },
  ],
  quiz: [
    { q: 'You swap a 50 mm lens for a 100 mm lens without moving the projector. The picture becomes…', options: ['twice as wide', 'half as wide', 'the same size but sharper', 'four times as wide'], answer: 1, why: 'Width = throw × chip width ÷ focal length. Doubling the focal length halves the width.' },
    { q: 'Why does tilting a projector down at a screen make a keystone shape?', options: ['The lens bends', 'Light to one edge of the picture travels further than to the other, so that edge spreads wider', 'The screen is curved', 'The chip is trapezoid-shaped'], answer: 1, why: 'Tilted down from a high booth, light to the bottom edge travels further, so the bottom comes out wider. Lens shift avoids tilting at all.' },
    { q: 'A silver screen has a gain of about 2.4. What is the catch?', options: ['It only works in 2D', 'It is bright straight on but gets dim quickly from the side seats', 'It makes colours black and white', 'It needs no projector'], answer: 1, why: 'Silver sends the light back in a narrow cone. Straight on it is bright; from far off to the side, much less light reaches you.' },
  ],
  reel: [
    { ms: 5200, caption: 'The lens spreads a 3 cm chip picture across a screen: a shorter lens throws a bigger picture.', set: { aim: 'shift', booth: 5, screen: 'white', seat: 'centre', throw: 22, lumens: 13000 }, anim: { f: [90, 40] }, view: { pos: [-29, 12, 19], target: [0, 5.5, 12] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    let room = null, roomKey = '';
    const buildRoom = (D, Wmax, Hmax) => {
      if (room) { root.remove(room); room.traverse((o) => { o.geometry?.dispose(); if (o.material && !o.material.map) o.material.dispose?.(); }); }
      room = new THREE.Group(); root.add(room);
      const Wr = Math.max(14, Wmax + 4), L = D + 3, Hr = Math.max(12, Hmax + 3);
      const floor = box(Wr, 0.1, L, M.matte(0x2a1f28)); floor.position.set(0, -0.05, L / 2 - 1); room.add(floor);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(Wr, Hr, L)), new THREE.LineBasicMaterial({ color: 0x5a6378, transparent: true, opacity: 0.4 })); edges.position.set(0, Hr / 2, L / 2 - 1); room.add(edges);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(Wr, Hr), M.matte(0x16141c)); wall.position.set(0, Hr / 2, -0.06); room.add(wall);
      const rows = Math.max(3, Math.floor((D - 7) / 1.1));
      const seats = makeSeats({ rows, cols: Math.min(24, Math.floor((Wr - 3) / 0.6)), pitch: 1.1, rise: 0.22, z0: 5 }); room.add(seats);
      room.rows = rows;
      return room;
    };
    // the physical screen (fixed to the lens-shift picture) and the projected picture (may keystone)
    const screenMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.9, side: THREE.DoubleSide });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), screenMat); root.add(scr);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: 0x0c0c10 })); root.add(frame);
    const pic = { canvas: document.createElement('canvas') }; pic.canvas.width = 512; pic.canvas.height = 277;
    const picTex = new THREE.CanvasTexture(pic.canvas); picTex.colorSpace = THREE.SRGBColorSpace;
    const GN = 10, img = new THREE.BufferGeometry();
    const posA = new Float32Array((GN + 1) * (GN + 1) * 3), uvA = new Float32Array((GN + 1) * (GN + 1) * 2), idx = [];
    for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * (GN + 1) + i; uvA[k * 2] = i / GN; uvA[k * 2 + 1] = j / GN; if (i < GN && j < GN) idx.push(k, k + 1, k + GN + 1, k + 1, k + GN + 2, k + GN + 1); }
    img.setAttribute('position', new THREE.BufferAttribute(posA, 3)); img.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); img.setIndex(idx);
    const picMat = new THREE.MeshBasicMaterial({ map: picTex, toneMapped: false, transparent: true, side: THREE.DoubleSide });
    const picMesh = new THREE.Mesh(img, picMat); picMesh.frustumCulled = false; picMesh.renderOrder = 2; root.add(picMesh);
    const proj = makeDigitalProjector({}); proj.scale.setScalar(1.6); root.add(proj);
    const boothF = box(6, 0.25, 3.2, M.matte(0x22252c)); root.add(boothF);
    const boothW = box(6, 3.2, 0.15, M.ghost(0x8ea0c0, 0.18)); root.add(boothW);
    const cone = lightCone(0xfff1c9, 0.13); root.add(cone);
    const you = makePerson({ sit: true, shirt: 0xffb547 }); root.add(you);
    const youLbl = stage.label('You', [0, 1.9, 0], you, 'hot');
    const L = {
      screen: stage.label('Screen', [0, 0, 0], root), proj: stage.label('Projector in the booth', [0, 0, 0], root, 'hot'),
      key: stage.label('', [0, 0, 0], root),
    };

    // brightness board
    const cur = {};
    const bb = board(root, 7.5, 4.2, 800, 448, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur.s) return;
      const s = cur.s, G = geometry(s), seat = cur.seatDeg ?? 0, fs = G.fL / SCREENS[s.screen].gain * gainAt(s.screen, seat);
      title(g, `${G.fL.toFixed(1)} fL in the middle, ${fs.toFixed(1)} fL at your seat`, `DCI asks for ${DCI_FL} fL (48 cd/m²) · ${Math.round(s.lumens).toLocaleString('en-US')} lm on ${G.W.toFixed(1)} × ${G.H.toFixed(1)} m`);
      // gain vs viewing angle for both screens
      const x0 = 60, y0 = 110, pw = w - 90, ph = 230, gy = (v) => y0 + ph - (v / 2.6) * ph, ax = (d) => x0 + (d / 60) * pw;
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1;
      for (const v of [0.5, 1, 1.5, 2, 2.5]) { g.beginPath(); g.moveTo(x0, gy(v)); g.lineTo(x0 + pw, gy(v)); g.stroke(); text(g, v.toFixed(1), x0 - 10, gy(v) + 5, { font: '14px sans-serif', col: COL.soft, align: 'right' }); }
      for (const [type, col] of [['white', '#e8eef8'], ['silver', '#8ef0ff']]) {
        g.strokeStyle = col; g.lineWidth = type === s.screen ? 4 : 1.5; g.beginPath();
        for (let d = 0; d <= 60; d += 1) { const x = ax(d), y = gy(gainAt(type, d)); d ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        text(g, SCREENS[type].name, ax(type === 'white' ? 44 : 8), gy(gainAt(type, type === 'white' ? 44 : 8)) - 10, { font: 'bold 16px sans-serif', col });
      }
      g.fillStyle = COL.hot; g.beginPath(); g.arc(ax(seat), gy(gainAt(s.screen, seat)), 8, 0, Math.PI * 2); g.fill();
      text(g, 'you', ax(seat) + 12, gy(gainAt(s.screen, seat)) + 20, { font: 'bold 16px sans-serif', col: COL.hot });
      text(g, 'gain', 14, y0 - 12, { font: '14px sans-serif', col: COL.soft });
      text(g, 'viewing angle off the middle →  0°', x0, y0 + ph + 24, { font: '14px sans-serif', col: COL.soft });
      text(g, '60°', x0 + pw, y0 + ph + 24, { font: '14px sans-serif', col: COL.soft, align: 'right' });
      // fL gauge
      const gx = 24, gw = w - 48, gy0 = 392, fx = (v) => gx + clamp(v / 30, 0, 1) * gw;
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(gx, gy0, gw, 20);
      g.fillStyle = 'rgba(123,224,140,.35)'; g.fillRect(fx(11), gy0, fx(17) - fx(11), 20);
      g.fillStyle = COL.amber; g.fillRect(fx(fs) - 3, gy0 - 6, 6, 32);
      text(g, '0', gx, gy0 + 42, { font: '14px sans-serif', col: COL.soft }); text(g, '14 fL target', fx(14), gy0 + 42, { font: '14px sans-serif', col: COL.green, align: 'center' }); text(g, '30 fL', gx + gw, gy0 + 42, { font: '14px sans-serif', col: COL.soft, align: 'right' });
    }, [0, 11.5, 18]);
    bb.mesh.rotation.y = -1.25;

    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    let lastK = '', t = 0;
    const inst = {
      update(dt, s, time) {
        dt = Math.max(0, dt); t += dt;
        fitNarrow(stage, [L.key], -0.1);
        reelBoards([[bb, [0, 13, 11], 1.7, [0, -1.25, 0]]]);
        const G = geometry(s), D = s.throw;
        const rk = `${D}|${Math.round(G.W)}`;
        if (rk !== roomKey) { roomKey = rk; buildRoom(D, Math.max(G.W, 16), G.H + 1.2 + s.booth); }
        const yc = 1.2 + G.H / 2, yp = yc + s.booth;
        scr.scale.set(G.W, G.H, 1); scr.position.set(0, yc, 0); frame.scale.copy(scr.scale); frame.position.set(0, yc, 0.01);
        // projector pose: level with lens shift, or tilted to aim at the screen centre
        const P = V(0, yp, D);
        const fwd = s.aim === 'tilt' ? V(0, yc - yp, -D).normalize() : V(0, 0, -1);
        const right = V(1, 0, 0), up = right.clone().cross(fwd).normalize();
        const hw = CHIP_FLAT_MM / 2 / s.f, hh = hw / ASPECT, shift = s.aim === 'tilt' ? 0 : (yc - yp) / D;
        proj.position.set(0.18, yp - 0.44, D + 1.36); proj.rotation.x = s.aim === 'tilt' ? -Math.atan2(yp - yc, D) : 0;
        boothF.position.set(0, yp - 1.2, D + 1.5); boothW.position.set(0, yp + 0.3, D + 3.0);
        const hit = (sx, sy) => { const d = fwd.clone().addScaledVector(right, sx * hw).addScaledVector(up, sy * hh + shift); const k = -P.z / d.z; return P.clone().addScaledVector(d, k); };
        const pa = img.attributes.position;
        for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const q = hit(-1 + (2 * i) / GN, -1 + (2 * j) / GN); pa.setXYZ(j * (GN + 1) + i, q.x, q.y, 0.03); }
        pa.needsUpdate = true; img.computeBoundingSphere();
        const c = [hit(-1, -1), hit(1, -1), hit(1, 1), hit(-1, 1)];
        cone.set([0, yp, D], c.map((q) => [q.x, q.y, 0.02]));
        const topW = c[2].x - c[3].x, botW = c[1].x - c[0].x;
        cur.key = (botW / topW - 1) * 100;          // tilted down: the bottom edge is further away, so wider
        L.screen.position.set(G.W / 2 + 0.5, yc - G.H / 2 - 0.5, 0.1);
        L.proj.position.set(0, yp + 1.6, D + 1);
        L.key.position.set(0, c[2].y + 1.1, 0.1);
        L.key.element.textContent = s.aim === 'tilt' && Math.abs(cur.key) > 0.3 ? `Keystone: bottom ${cur.key.toFixed(1)}% wider` : 'Rectangular picture';
        L.key.element.classList.toggle('hot', s.aim === 'tilt' && Math.abs(cur.key) > 0.3);
        // your seat and its viewing angle to the screen centre
        const rows = room.rows, seat = SEATS[s.seat], r = Math.round(seat.frac * (rows - 1));
        const sz = 5 + r * 1.1, sx = seat.x * Math.min(6.4, Math.max(3, G.W / 2 + 1.5)), sy = r * 0.22;
        you.position.set(sx, sy + 0.05, sz - 0.1);
        const eye = V(sx, sy + 1.2, sz), toEye = eye.clone().sub(V(0, yc, 0)).normalize();
        cur.seatDeg = (Math.acos(clamp(toEye.z, -1, 1)) * 180) / Math.PI;
        screenMat.color.setHex(s.screen === 'silver' ? 0xc8ccd4 : 0xf2f0ea); screenMat.metalness = s.screen === 'silver' ? 0.6 : 0; screenMat.roughness = s.screen === 'silver' ? 0.4 : 0.9;
        // the picture's brightness at your seat relative to the DCI target
        const fs = G.fL / SCREENS[s.screen].gain * gainAt(s.screen, cur.seatDeg);
        const b = clamp(fs / DCI_FL, 0.15, 1.3);
        const g = pic.canvas.getContext('2d'); drawScene(g, 512, 277, t * 0.6, { dim: clamp(b, 0.15, 1) }); picTex.needsUpdate = true;
        picMat.opacity = 1;
        cur.s = s; cur.fs = fs;
        const k = `${s.f}|${s.throw}|${s.screen}|${Math.round(s.lumens)}|${s.seat}|${s.booth}|${s.aim}`;
        if (k !== lastK) { lastK = k; bb.redraw(); }
        void youLbl; void time;
      },
      readout(s) {
        const G = geometry(s), fs = cur.fs ?? G.fL;
        const ok = fs >= 11 && fs <= 17;
        return `<div class="big">${G.W.toFixed(1)} × ${G.H.toFixed(1)} m picture</div>
          <div class="row"><span>Throw ratio</span><b>${(s.throw / G.W).toFixed(2)} : 1 (${Math.round(s.f)} mm lens, ${s.throw.toFixed(1)} m)</b></div>
          <div class="row"><span>Brightness, middle</span><b>${G.fL.toFixed(1)} fL (${(G.fL * 3.426).toFixed(0)} cd/m²)</b></div>
          <div class="row"><span>At your seat (${cur.seatDeg?.toFixed(0) ?? 0}° off centre)</span><b>${fs.toFixed(1)} fL</b></div>
          <div class="row"><span>Shape</span><b>${s.aim === 'tilt' && Math.abs(cur.key ?? 0) > 0.3 ? `keystone, bottom ${cur.key.toFixed(1)}% wider` : 'rectangle'}</b></div>
          <div class="${ok ? 'ok' : 'no'}">${ok ? 'Within the DCI 14 fL range (about ±3 fL).' : fs < 11 ? 'Too dim for the DCI 14 fL standard.' : 'Brighter than the 14 fL standard.'}</div>`;
      },
    };
    return inst;
  },
};
