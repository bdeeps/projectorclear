// Chapter 2: digital cinema with DLP. A lamp or lasers light three DMD chips (red, green, blue) through a
// prism; each chip has millions of tilting micromirrors, and grey levels come from how long each mirror
// points at the lens during a frame (pulse-width modulation).
//  - DCI 4K = 4096 × 2160 pixels, so one chip has 8,847,360 mirrors (DCI specification).
//  - Mirrors tilt about their diagonal to roughly +12° (on) or −12° (off) and switch thousands of times a
//    second (Wikipedia "Digital micromirror device"; TI DLP). The 1.38-inch 4K cinema chip puts them about
//    7.5 µm apart (derived from TI's chip size).
//  - Binary pulse-width modulation: bit b is shown for 2^b / 255 of the frame. Real DLP Cinema uses more
//    bits (about 12 per colour), split and dithered bit planes; 8 bits keep the picture readable.
//  - Xenon cinema lamps are typically 2–7 kW (Wikipedia "Movie projector"); laser light sources arrived in
//    cinemas around 2012–2014 and last far longer than bulbs (makers quote tens of thousands of hours).
import { THREE, M, box, latheX, sphere, clamp } from '../kit.js';
import { TAU, DEG, TILT, K4, MIRROR_UM, board, panelBg, title, text, wrap, COL, fitNarrow, reelBoards, lightCone, stick } from '../projector.js';

const COLS = 12, ROWS = 7, PITCH = 0.1, MS = 0.088;
const BITS = 8;
// On (1) or off (0) at fraction u of the frame, for grey level v, with bit planes sent largest first.
export function pwm(v, u) {
  let t = 0;
  for (let b = BITS - 1; b >= 0; b--) { const d = (1 << b) / 255; if (u < t + d) return (v >> b) & 1; t += d; }
  return v & 1;
}
// Mirror flips per frame when the same grey repeats frame after frame (the sequence wraps around).
const flipsPerFrame = (v) => { let n = 0; for (let b = BITS - 1; b >= 0; b--) { const nb = b === 0 ? BITS - 1 : b - 1; if (((v >> b) & 1) !== ((v >> nb) & 1)) n++; } return n; };

export default {
  id: 'dlp',
  short: 'Digital cinema (DLP)',
  title: 'Millions of tiny tilting mirrors',
  subtitle: 'A digital projector makes each pixel with a mirror smaller than a hair’s width, flipping thousands of times a second.',
  view: { pos: [0.5, 2.2, 4.7], target: [0.45, 1.2, 0] },
  learn: `<p>Since about 2010 almost every cinema has swapped its film projector for a <b>digital</b> one. Most use <b>DLP</b>, a chip invented at Texas Instruments. The film arrives as files (the DCP chapter shows how), and the projector turns each frame into light.</p>
    <p>The light starts at a <b>xenon lamp</b> or, in newer projectors, banks of <b>lasers</b>. A glass <b>prism</b> splits it into <b>red, green and blue</b>, and sends each colour to its own chip: a <b>DMD</b>, or digital micromirror device. A 4K chip holds <b>4096 × 2160</b> mirrors, almost 9 million, each about <b>7.5 thousandths of a millimetre</b> across. Each mirror can only tilt about <b>+12°</b>, towards the lens, or <b>−12°</b>, into a black light trap.</p>
    <p>So how does a mirror make grey? By <b>timing</b>. In each frame it flips on and off in a pattern, thousands of times a second. On for half the frame looks half as bright, because your eye averages the flashes. This is <b>pulse-width modulation</b>. The prism then adds the three colour pictures back together and the lens throws them onto the screen. TVClear shows how TVs make pixels instead; GradeClear covers the DCI-P3 colours.</p>
    <p class="tip"><b>Try it:</b> slow time 200× and pick a grey level. Watch the outlined mirror flip in its pattern, and the timeline fill in. Then switch the light source to laser.</p>`,
  terms: [
    { t: 'DLP', d: 'Digital Light Processing: projection with chips of tilting micromirrors, one mirror per pixel.' },
    { t: 'DMD', d: 'Digital micromirror device, the chip itself. Each mirror sits on a tiny hinge and tilts on or off.' },
    { t: 'Pulse-width modulation', d: 'Making in-between brightness by switching fully on and off, and changing how long it stays on.' },
    { t: 'Bit plane', d: 'One slice of a frame where every mirror shows one bit of its grey value. Bigger bits last longer.' },
    { t: '3-chip DLP', d: 'Three DMDs, one each for red, green and blue, working at the same time and joined by a prism.' },
    { t: 'Laser light source', d: 'Lasers instead of a lamp: purer colours, steady brightness, and a much longer life.' },
  ],
  defaults: { grey: 180, slow: 200, source: 'xenon' },
  controls: [
    { key: 'grey', type: 'range', label: 'Grey level of the outlined mirror', min: 0, max: 255, step: 1, ends: ['0 black', '255 white'], fmt: (v) => `${Math.round(v)} of 255 · on ${(Math.round(v) / 2.55).toFixed(0)}%` },
    { key: 'slow', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real' }, { v: 200, label: '200× slower' }, { v: 2000, label: '2,000× slower' }], fmt: (v) => (v === 1 ? 'you see the average' : `a frame lasts ${(v / 24).toFixed(0)} s`) },
    { key: 'source', type: 'seg', label: 'Light source', options: [{ v: 'xenon', label: 'Xenon lamp' }, { v: 'laser', label: 'RGB laser' }] },
  ],
  quiz: [
    { q: 'How does one DLP mirror show a medium grey?', options: ['It tilts halfway', 'It flips on and off very fast and stays on for about half of each frame', 'It turns grey', 'It dims the lamp'], answer: 1, why: 'Each mirror is only ever on or off. Grey comes from the share of time it points at the lens, which your eye averages.' },
    { q: 'How many mirrors are on one DCI 4K chip?', options: ['About 2 million', 'About 9 million', 'About 100,000', 'About 1 billion'], answer: 1, why: '4096 × 2160 = 8,847,360. A 3-chip projector has three of them.' },
    { q: 'Why does a 3-chip DLP projector need a prism?', options: ['To cool the chips', 'To split white light into red, green and blue for the three chips, then join the three pictures again', 'To make the picture 3D', 'To focus the image'], answer: 1, why: 'Each chip handles one colour. The prism separates the colours on the way in and recombines them on the way out to the lens.' },
  ],
  reel: [
    { ms: 5000, caption: 'A digital projector splits light into red, green and blue, one mirror chip for each.', set: { slow: 200, source: 'laser', grey: 180 }, view: { pos: [-0.4, 2.0, 3.6], target: [-0.2, 1.3, 0] }, spin: 0.4 },
    { ms: 5600, caption: 'Each pixel is a mirror that tilts ±12°, flipping thousands of times a second to make grey.', set: { slow: 200, source: 'laser' }, anim: { grey: [40, 230] }, view: { pos: [2.1, 1.9, 2.6], target: [1.6, 1.55, 0.2] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const AX = 1.3;
    // ---------------------------------------------------------------- projector body (see-through)
    const shell = box(2.5, 0.8, 1.0, M.clear(0x9fb4d8, 0.1)); shell.position.set(-0.35, AX, 0); shell.castShadow = false; root.add(shell);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.5, 0.8, 1.0)), new THREE.LineBasicMaterial({ color: 0x7a8aa8, transparent: true, opacity: 0.6 })); edges.position.copy(shell.position); root.add(edges);
    const base = box(2.3, 0.9, 0.9, M.matte(0x23262d)); base.position.set(-0.35, 0.45, 0); root.add(base);
    // xenon source
    const xenon = new THREE.Group(); xenon.position.set(-1.35, AX, 0); root.add(xenon);
    xenon.add(latheX(Array.from({ length: 14 }, (_, i) => { const t = i / 13; return [-0.25 + 0.22 * t, 0.22 * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2))]; }), M.metal(0xe8eef6, { roughness: 0.08, side: THREE.DoubleSide })));
    xenon.add(latheX([[-0.18, 0.01], [-0.08, 0.013], [-0.05, 0.035], [0, 0.035], [0.03, 0.013], [0.1, 0.01]], M.glass(), { seg: 20 }));
    const xArc = sphere(0.02, M.glow(0xfff6e0)); xArc.position.x = -0.025; xenon.add(xArc);
    // laser source: banks of red, green and blue diodes feeding a fibre
    const laser = new THREE.Group(); laser.position.set(-1.35, AX, 0); root.add(laser);
    [[0xff3b30, 0.18], [0x34e07a, 0], [0x3b6bff, -0.18]].forEach(([c, z]) => {
      const bank = box(0.2, 0.3, 0.14, M.matte(0x2a2e36)); bank.position.set(-0.08, 0, z); laser.add(bank);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const d = box(0.02, 0.05, 0.03, M.glow(c)); d.position.set(0.03, -0.09 + i * 0.09, z - 0.03 + j * 0.06); laser.add(d); }
    });
    const fibre = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 12), M.glow(0xffffff)); fibre.rotation.z = Math.PI / 2; fibre.position.set(0.2, 0, 0); laser.add(fibre);
    // integrator rod and relay lens
    const rodG = box(0.5, 0.07, 0.07, M.glass({ color: 0xdff3ff })); rodG.position.set(-0.75, AX, 0); root.add(rodG);
    const relay = latheX([[-0.02, 0], [-0.015, 0.1], [0.015, 0.1], [0.02, 0]], M.glass()); relay.position.set(-0.4, AX, 0); root.add(relay);
    // prism with three chips
    const prism = box(0.32, 0.32, 0.32, M.glass({ color: 0xe6f6ff, thickness: 0.5 })); prism.position.set(0, AX, 0); root.add(prism);
    const chipDefs = [['R', 0xff4a3d, [0, 0.2, 0], [-Math.PI / 2, 0, 0]], ['G', 0x3ee27f, [0, 0, -0.2], [0, 0, 0]], ['B', 0x4d7bff, [0, -0.2, 0], [Math.PI / 2, 0, 0]]];
    const chips = chipDefs.map(([id, c, pos, rot]) => {
      const g = new THREE.Group(); g.position.set(pos[0], AX + pos[1], pos[2]); g.rotation.set(...rot); root.add(g);
      const pkg = box(0.2, 0.2, 0.03, M.matte(0xd9d2c0)); g.add(pkg);
      const die = box(0.12, 0.07, 0.006, M.metal(c, { roughness: 0.15, emissive: c, emissiveIntensity: 0.4 })); die.position.z = 0.02 * (id === 'G' ? 1 : 1); g.add(die);
      return { id, g, c };
    });
    chips[1].g.rotation.y = 0; chips[1].g.children.forEach((m) => { m.position.z = -m.position.z; });
    // lens
    const lens = latheX([[0, 0.12], [0.05, 0.13], [0.55, 0.12], [0.62, 0.1]], M.metal(0x2a2d33)); lens.position.set(0.2, AX, 0); root.add(lens);
    const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24), M.glow(0xf4f8ff)); lensGlass.rotation.y = Math.PI / 2; lensGlass.position.set(0.825, AX, 0); root.add(lensGlass);
    // light paths
    const beamA = lightCone(0xfff1c9, 0.18); root.add(beamA);
    beamA.set([-1.45, AX, 0], [[-1.0, AX - 0.035, -0.035], [-1.0, AX - 0.035, 0.035], [-1.0, AX + 0.035, 0.035], [-1.0, AX + 0.035, -0.035]]);
    const cols = chipDefs.map(([, c, pos]) => { const s = stick(0.03, M.glow(c, { transparent: true, opacity: 0.8 })); s.between([0, AX, 0], [pos[0], AX + pos[1] * 0.85, pos[2] * 0.85]); root.add(s); return s; });
    const white = stick(0.035, M.glow(0xffffff, { transparent: true, opacity: 0.7 })); white.between([-0.5, AX, 0], [-0.02, AX, 0]); root.add(white);
    const out = lightCone(0xf4f8ff, 0.1); root.add(out);
    out.set([0.83, AX, 0], [[1.3, AX - 0.08, -0.14], [1.3, AX - 0.08, 0.14], [1.3, AX + 0.08, 0.14], [1.3, AX + 0.08, -0.14]]);

    // ---------------------------------------------------------------- a patch of mirrors, hugely enlarged
    const zoom = new THREE.Group(); zoom.position.set(1.85, 1.62, 0.1); zoom.rotation.set(-0.25, -0.5, 0); root.add(zoom);
    const plate = box(COLS * PITCH + 0.12, ROWS * PITCH + 0.12, 0.03, M.matte(0x1a1d24)); plate.position.z = -0.05; zoom.add(plate);
    const axis = new THREE.Vector3(1, 1, 0).normalize(), Z = new THREE.Vector3(0, 0, 1);
    const qOn = new THREE.Quaternion().setFromAxisAngle(axis, TILT * DEG), qOff = new THREE.Quaternion().setFromAxisAngle(axis, -TILT * DEG);
    const nOn = Z.clone().applyQuaternion(qOn), nOff = Z.clone().applyQuaternion(qOff);
    // light arrives so that an "on" mirror sends it straight out along +z, towards the lens
    const toSrc = nOn.clone().multiplyScalar(2 * nOn.dot(Z)).sub(Z).normalize();           // direction back to the light
    const inDir = toSrc.clone().negate();
    const refl = (n) => inDir.clone().sub(n.clone().multiplyScalar(2 * inDir.dot(n))).normalize();
    const outOn = refl(nOn), outOff = refl(nOff);
    const mirrors = new THREE.InstancedMesh(new THREE.BoxGeometry(MS, MS, 0.008), M.metal(0xdfe6ef, { roughness: 0.12 }), COLS * ROWS);
    mirrors.instanceMatrix.setUsage(THREE.DynamicDrawUsage); zoom.add(mirrors);
    const rays = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6), M.glow(0xfff1c9, { transparent: true, opacity: 0.8 }), COLS * ROWS);
    rays.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rays.frustumCulled = false; zoom.add(rays);
    rays.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COLS * ROWS * 3), 3);
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), M.metal(0x777777), COLS * ROWS); zoom.add(posts);
    const o = new THREE.Object3D(), Y = new THREE.Vector3(0, 1, 0);
    const cell = (c, r) => [(c - (COLS - 1) / 2) * PITCH, (r - (ROWS - 1) / 2) * PITCH];
    for (let i = 0; i < COLS * ROWS; i++) { const [x, y] = cell(i % COLS, Math.floor(i / COLS)); o.position.set(x, y, -0.025); o.rotation.set(Math.PI / 2, 0, 0); o.updateMatrix(); posts.setMatrixAt(i, o.matrix); }
    const WATCH = [8, 3];
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.07, 4, 1, Math.PI / 4), M.glow(0xffd166)); ring.position.set(...cell(...WATCH), 0.02); zoom.add(ring);
    // incoming light and the two exits
    const inBeam = stick(0.02, M.glow(0xfff1c9, { transparent: true, opacity: 0.35 })); zoom.add(inBeam);
    inBeam.between(toSrc.clone().multiplyScalar(1.1).toArray(), [0, 0, 0]);
    const dump = box(0.3, 0.2, 0.05, M.matte(0x0a0a0c)); dump.position.copy(outOff.clone().multiplyScalar(0.95)); dump.lookAt(0, 0, 0); zoom.add(dump);
    const lensMark = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 32), M.glow(0x8ef0ff)); lensMark.position.set(0, 0, 0.95); zoom.add(lensMark);

    // column grey levels: a ramp from black to white, and the watched mirror plays the slider value
    const greyOf = (c, r, s) => (c === WATCH[0] && r === WATCH[1] ? Math.round(s.grey) : Math.round((c / (COLS - 1)) * 255));

    // ---------------------------------------------------------------- the PWM board
    const cur = { grey: 180, u: 0, slow: 200 };
    const pw = board(root, 2.2, 1.0, 880, 400, (g, w, h) => {
      panelBg(g, w, h);
      const v = Math.round(cur.grey);
      title(g, `One mirror, one frame (1/24 s): grey ${v} of 255`, `on for ${(v / 2.55).toFixed(0)}% of the frame · ${flipsPerFrame(v) * 24} flips a second`);
      const x0 = 24, W = w - 48, y0 = 110, bh = 64;
      let t = 0;
      for (let b = BITS - 1; b >= 0; b--) {
        const d = (1 << b) / 255, x = x0 + t * W, ww = d * W, on = (v >> b) & 1;
        g.fillStyle = on ? COL.amber : 'rgba(255,255,255,.08)'; g.fillRect(x + 1, y0, Math.max(1, ww - 2), bh);
        if (ww > 26) text(g, String(1 << b), x + ww / 2, y0 + bh + 24, { font: '15px sans-serif', col: COL.soft, align: 'center' });
        t += d;
      }
      text(g, 'bit planes, biggest first (each number is how long that slice lasts)', x0, y0 + bh + 50, { font: '15px sans-serif', col: COL.soft });
      if (cur.slow > 1) { const x = x0 + cur.u * W; g.fillStyle = '#fff'; g.fillRect(x - 2, y0 - 10, 4, bh + 20); }
      const sw = v / 255; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x0, 280, 90, 90); g.strokeStyle = COL.soft; g.strokeRect(x0, 280, 90, 90);
      wrap(g, `Your eye averages the flashes and sees this grey. The shortest slice lasts ${(1e6 / 24 / 255).toFixed(0)} µs. Real cinema chips use about 12 bits and split the slices, but the idea is the same.`, x0 + 110, 300, W - 110, 24, { font: '18px sans-serif', col: COL.text });
      void sw;
    }, [1.3, 0.42, 0.75]); pw.mesh.rotation.y = -0.2; pw.mesh.scale.setScalar(0.95);

    const L = (t, pos, parent = root, cls = '') => stage.label(t, pos, parent, cls);
    const labels = {
      src: L('Light source', [-1.35, AX + 0.5, 0.2], root, 'hot'), rod: L('Integrator rod', [-0.75, AX - 0.2, 0.3]),
      prism: L('Prism', [0.0, AX + 0.02, 0.35]), r: L('Red chip', [0.0, AX + 0.4, 0]), gC: L('Green chip', [-0.2, AX - 0.02, -0.45]), b: L('Blue chip', [0.0, AX - 0.35, 0.1]),
      lens: L('Lens', [0.6, AX + 0.25, 0]), zoom: L('Mirrors, 10,000× bigger', [0, -0.52, 0], zoom, 'hot'), lensM: L('to the lens (on, +12°)', [0, 0.22, 0.95], zoom), dump: L('light trap (off, −12°)', outOff.clone().multiplyScalar(1.05).add(new THREE.Vector3(0, 0.15, 0)).toArray(), zoom),
    };
    const minor = [labels.rod, labels.gC, labels.b, labels.dump];

    let u = 0, lastBoard = -1, lastKey = '';
    const tmpC = new THREE.Color(), Q = new THREE.Quaternion(), SC = new THREE.Vector3(1, 1, 1);
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, minor, -0.1);
        reelBoards([[pw, [0.3, 0.1, 0.9], 0.95]]);
        xenon.visible = s.source === 'xenon'; laser.visible = s.source === 'laser';
        xArc.scale.setScalar(1 + 0.1 * Math.sin(time * 37));
        u = (u + (dt * 24) / s.slow) % 1;
        const real = s.slow === 1;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c, v = greyOf(c, r, s);
          // at real speed the eye only sees the average, so show each mirror at its time-averaged state
          const on = real ? v / 255 : pwm(v, u);
          const [x, y] = cell(c, r);
          Q.copy(on >= 0.5 ? qOn : qOff);
          o.position.set(x, y, 0); o.quaternion.copy(Q); o.scale.set(1, 1, 1); o.updateMatrix(); mirrors.setMatrixAt(i, o.matrix);
          const dir = on >= 0.5 ? outOn : outOff, len = 0.5;
          o.position.set(x + dir.x * len / 2, y + dir.y * len / 2, dir.z * len / 2); o.quaternion.setFromUnitVectors(Y, dir); o.scale.set(1, len, 1); o.updateMatrix(); rays.setMatrixAt(i, o.matrix);
          const k = real ? v / 255 : on ? 1 : 0.12;
          tmpC.setRGB(k, k * 0.95, k * 0.8); rays.setColorAt(i, tmpC);
          mirrors.setColorAt(i, tmpC.setRGB(0.35 + 0.65 * k, 0.35 + 0.65 * k, 0.38 + 0.62 * k));
        }
        mirrors.instanceMatrix.needsUpdate = true; rays.instanceMatrix.needsUpdate = true; rays.instanceColor.needsUpdate = true; if (mirrors.instanceColor) mirrors.instanceColor.needsUpdate = true;
        void SC;
        // light colour from the source: lasers are saturated primaries, xenon is filtered white
        cols.forEach((st, i) => { st.material.opacity = s.source === 'laser' ? 0.95 : 0.6; });
        cur.grey = s.grey; cur.slow = s.slow; cur.u = u;
        const key = `${Math.round(s.grey)}|${s.slow}`, bu = Math.floor(u * 120);
        if (key !== lastKey || (s.slow > 1 && bu !== lastBoard)) { lastKey = key; lastBoard = bu; pw.redraw(); }
      },
      readout: (s) => {
        const n = K4.w * K4.h;
        return `<div class="big">${(n / 1e6).toFixed(1)} million mirrors per chip</div>
          <div class="row"><span>DCI 4K chip</span><b>${K4.w} × ${K4.h} = ${n.toLocaleString('en-US')}</b></div>
          <div class="row"><span>3 chips (R, G, B)</span><b>${(3 * n / 1e6).toFixed(1)} million mirrors</b></div>
          <div class="row"><span>Mirror spacing</span><b>about ${MIRROR_UM} µm, tilt ±${TILT}°</b></div>
          <div class="row"><span>This mirror (8-bit)</span><b>on ${(Math.round(s.grey) / 2.55).toFixed(0)}% of each frame, ${flipsPerFrame(Math.round(s.grey)) * 24} flips/s</b></div>
          <div class="row"><span>Light</span><b>${s.source === 'xenon' ? 'xenon arc lamp, 2–7 kW typical' : 'red, green and blue lasers'}</b></div>`;
      },
    };
  },
};
