// Chapter 1: the 35 mm film projector. Platters feed the film, a Maltese cross (Geneva drive) pulls each
// frame into the gate and holds it still, a rotary shutter hides the pulldown and flashes each frame
// twice, and a xenon lamp and lens throw it onto the screen.
//  - 35 mm: 19.0 mm per frame (4 perfs × 4.75 mm), 16 frames per foot, 90 ft/min at 24 fps (SMPTE 35 mm).
//  - 4-slot Geneva: film moves during 90° of the drive wheel's turn, i.e. 1/4 of each frame (Wikipedia "Geneva drive").
//  - Shutters flash each frame 2× (48 Hz) or 3× (72 Hz) (Wikipedia "Movie projector"). Silent films at
//    about 16 fps used three blades for 48 flashes.
//  - Flicker fusion at cinema brightness: roughly 40–50 Hz; it rises with brightness (Wikipedia "Flicker fusion threshold").
//  - Optical sound reader: 21 frames after the gate on 35 mm (Wikipedia "Movie projector").
//  - Xenon short-arc lamps in cinemas: typically about 2–7 kW; IMAX used 15 kW (Wikipedia "Movie projector").
import { THREE, M, box, rod, latheX, tube, sphere, clamp } from '../kit.js';
import {
  TAU, PULLDOWN, FRAME_MM, FRAMES_PER_FOOT, SOUND_OFFSET_FRAMES, FUSION_HZ, geneva, filmPos,
  board, panelBg, title, text, COL, drawScene, fitNarrow, reelBoards, lightCone,
} from '../projector.js';

const P = 0.19;                           // enlarged model: 19 mm frame pitch shown 10× bigger
const RS = (4 * P) / TAU;                 // intermittent sprocket radius: 16 teeth, a quarter turn per frame
const GA = 0.2, GC = GA * Math.SQRT2;     // Geneva pin radius and centre distance
const CROSS = [0.145 + RS, 0], DRIVE = [0.145 + RS + GC, 0];
const GATE_Y = 0.36;

// Is the light through the gate at cycle phase p (0…1 of a frame) with N shutter blades?
// Blade 0 is centred on the pulldown; blades are 180/N degrees wide, so the screen is lit half the time.
export function shutterOpen(p, N) {
  const half = 1 / (4 * N);
  for (let k = 0; k < N; k++) { let d = ((p - PULLDOWN / 2 - k / N) % 1 + 1.5) % 1 - 0.5; if (Math.abs(d) < half) return false; }
  return true;
}
const covered = (N) => 360 / (2 * N) >= PULLDOWN * 360;   // blade at least as wide as the 90° pulldown

// A flat Maltese cross with 4 slots and 4 concave locking arcs, in the xy plane.
function crossShape(a) {
  const pts = [], sw = 0.11 * a, rin = (Math.SQRT2 - 1) * a - 0.02 * a, gam = 15 * Math.PI / 180, C = Math.SQRT2 * a;
  for (let k = 0; k < 4; k++) {
    const b = k * Math.PI / 2, ca = Math.cos(b), sa = Math.sin(b);
    const loc = (u, v) => [u * ca - v * sa, u * sa + v * ca];
    const vTip = Math.asin(sw / a);
    for (let t = -gam; t <= -vTip; t += 0.02) pts.push([a * Math.cos(b + t), a * Math.sin(b + t)]);
    pts.push(loc(Math.sqrt(a * a - sw * sw), -sw), loc(rin, -sw));
    // the round bottom of the slot
    for (let t = -Math.PI / 2; t <= Math.PI / 2 + 1e-6; t += Math.PI / 8) pts.push(loc(rin - sw * Math.cos(t), sw * Math.sin(t)));
    pts.push(loc(Math.sqrt(a * a - sw * sw), sw));
    for (let t = vTip; t <= gam; t += 0.02) pts.push([a * Math.cos(b + t), a * Math.sin(b + t)]);
    // the concave arc around the drive's locking disc, centred between this arm and the next
    const cx = C * Math.cos(b + Math.PI / 4), cy = C * Math.sin(b + Math.PI / 4);
    const p1 = [a * Math.cos(b + gam), a * Math.sin(b + gam)], p2 = [a * Math.cos(b + Math.PI / 2 - gam), a * Math.sin(b + Math.PI / 2 - gam)];
    const a1 = Math.atan2(p1[1] - cy, p1[0] - cx); let a2 = Math.atan2(p2[1] - cy, p2[0] - cx);
    const rl = Math.hypot(p1[0] - cx, p1[1] - cy);
    // go the way round that passes nearest the cross centre
    if (a2 > a1) a2 -= TAU;
    const mid = (a1 + a2) / 2, near = Math.hypot(cx + rl * Math.cos(mid), cy + rl * Math.sin(mid)) < C;
    if (!near) a2 += TAU;
    for (let i = 1; i < 16; i++) { const t = a1 + (a2 - a1) * (i / 16); pts.push([cx + rl * Math.cos(t), cy + rl * Math.sin(t)]); }
  }
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
}
function extrude(shape, depth, mat) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
// A wheel whose axis runs along z.
function wheelZ(r, len, mat, seg = 32) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.rotation.x = Math.PI / 2; m.castShadow = true; return m; }

// The film strip texture: 8 frames of the generic scene, perforations, and an optical soundtrack.
function filmTexture() {
  const W = 256, FH = 256, N = 8, c = document.createElement('canvas'); c.width = W; c.height = FH * N;
  const g = c.getContext('2d');
  g.fillStyle = '#1a120c'; g.fillRect(0, 0, W, FH * N);
  const img = document.createElement('canvas'); img.width = 200; img.height = 108;
  for (let i = 0; i < N; i++) {
    const y0 = i * FH;
    drawScene(img.getContext('2d'), 200, 108, (N - 1 - i) / 24 * 6);
    g.drawImage(img, 44, y0 + (FH - 150) / 2, 176, 150);
    for (let k = 0; k < 4; k++) { g.fillStyle = '#d8d2c4'; for (const x of [8, W - 26]) { g.beginPath(); g.roundRect(x, y0 + 12 + k * 64, 18, 34, 5); g.fill(); } }
    // variable-area soundtrack: a wiggly clear band between the picture and the left perforations
    g.fillStyle = '#e8e2d2';
    for (let y = 0; y < FH; y += 2) { const w = 5 + 4 * Math.abs(Math.sin((y0 + y) * 0.09) * Math.cos((y0 + y) * 0.023)); g.fillRect(34 - w / 2 + 2, y0 + y, w, 2); }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}

export default {
  id: 'film',
  short: 'The film projector',
  title: 'Inside a 35 mm film projector',
  subtitle: 'A Maltese cross stops each frame, a spinning shutter flashes it twice, and a xenon lamp throws it 30 metres.',
  view: { pos: [0.1, 2.05, 4.8], target: [0.0, 1.55, 0] },
  learn: `<p>For a hundred years a cinema showed films from a <b>strip of 35 mm film</b>. A feature was spliced into one long roll, often 3 km or more, and laid flat on big turntables called <b>platters</b>. The film is pulled from the middle of the <b>feed platter</b>, runs up and over to the projector, and winds back onto the <b>take-up platter</b>.</p>
    <p>Inside the projector the film cannot just flow past the lens, or the picture would smear. A <b>Maltese cross</b> (a <b>Geneva drive</b>) does the trick. A wheel spins steadily, and once each turn its pin drops into a slot and flicks the cross a <b>quarter turn</b>. A <b>sprocket</b> on the same shaft pulls the film down <b>one frame</b>. Then the cross is locked, and the frame stands still in the <b>gate</b> for three quarters of the time.</p>
    <p>A <b>rotary shutter</b> blocks the light while the film moves. It also has a <b>second blade</b> that cuts the light once more in the middle of each frame. So 24 frames become <b>48 flashes</b> a second, fast enough that your eye stops seeing flicker (see EyeClear for why). Behind it all glows a <b>xenon lamp</b>, a few kilowatts of arc in a mirror. Below the gate, a light and a sensor read the <b>optical soundtrack</b> printed beside the pictures (FilmSoundClear has the sound story; CineCameraClear shows the claw that filmed each frame).</p>
    <p class="tip"><b>Try it:</b> slow the projector 48× and watch the pin, the cross and the film. Then try one blade: the light now flashes only 24 times a second, and the flicker meter turns red.</p>`,
  terms: [
    { t: 'Platter', d: 'A big turntable holding a whole feature as one flat roll, so no one has to change reels.' },
    { t: 'Geneva drive', d: 'A pin wheel and a slotted Maltese cross that turn smooth spinning into sudden quarter-turn steps.' },
    { t: 'Intermittent sprocket', d: 'The toothed drum on the cross’s shaft that jerks the film down one frame at a time.' },
    { t: 'Gate', d: 'The window where each frame is held flat and still while light passes through it.' },
    { t: 'Rotary shutter', d: 'A spinning bladed disc that hides the moving film and flashes each still frame, usually twice.' },
    { t: 'Flicker fusion', d: 'The flash rate above which a flashing light looks steady. At cinema brightness it is roughly 40 to 50 Hz.' },
    { t: 'Xenon lamp', d: 'A quartz bulb of xenon gas with an electric arc inside, giving a bright, daylight-coloured light.' },
  ],
  defaults: { fps: 24, blades: 2, slow: 48, lamp: false },
  controls: [
    { key: 'slow', type: 'seg', label: 'Projector speed', options: [{ v: 1, label: 'Real' }, { v: 12, label: '12× slower' }, { v: 48, label: '48× slower' }], fmt: (v) => (v === 1 ? 'real time' : `1/${v} speed`) },
    { key: 'blades', type: 'seg', label: 'Shutter blades', options: [{ v: 1, label: 'One' }, { v: 2, label: 'Two' }, { v: 3, label: 'Three' }], fmt: (v, s) => `${s.fps * v} flashes/s` },
    { key: 'fps', type: 'seg', label: 'Film speed', options: [{ v: 16, label: '16 fps (silent era)' }, { v: 24, label: '24 fps (sound)' }], fmt: (v) => `${v * 60 / FRAMES_PER_FOOT} ft/min` },
    { key: 'lamp', type: 'toggle', label: 'Open the lamphouse', hint: 'See the xenon bulb and its mirror.' },
  ],
  quiz: [
    { q: 'What does the Maltese cross (Geneva drive) do?', options: ['Cools the lamp', 'Turns steady spinning into a quick quarter-turn step, so the film jumps one frame and then stops', 'Focuses the lens', 'Reads the soundtrack'], answer: 1, why: 'The pin flicks the cross a quarter turn once per frame; the sprocket on its shaft pulls the film down one frame, then everything locks still.' },
    { q: 'Why does a projector shutter have two blades when the film runs at 24 frames a second?', options: ['To show each frame twice, 48 flashes a second, which is above the flicker your eye can see', 'To make the film run twice as fast', 'To show two different frames at once', 'To save electricity'], answer: 0, why: '24 flashes a second flickers badly. Interrupting each frame once more gives 48, which most people see as steady light.' },
    { q: 'At 24 fps with a 4-slot Maltese cross, for how long is each frame held still?', options: ['About 42 ms, the whole frame', 'About 31 ms, three quarters of the frame', 'About 10 ms', 'It never stops'], answer: 1, why: 'A frame lasts 1/24 s = 41.7 ms. The pulldown takes a quarter of that, 10.4 ms, so the frame is still for about 31 ms.' },
  ],
  reel: [
    { ms: 5200, caption: 'A film projector pulls each frame into the gate, holds it still, and flashes light through it.', set: { fps: 24, blades: 2, slow: 12, lamp: true }, view: { pos: [0.1, 2.05, 4.8], target: [0.0, 1.55, 0] }, spin: 0.35 },
    { ms: 5600, caption: 'A Maltese cross turns a quarter turn per frame: the film jumps down, then stands still.', set: { fps: 24, blades: 2, slow: 48, lamp: false }, view: { pos: [1.75, 2.3, 2.5], target: [1.5, 2.12, 0.3] }, spin: 0 },
    { ms: 5000, caption: 'Two shutter blades flash every frame twice: 24 frames become 48 flashes, too fast to see flicker.', set: { fps: 24, slow: 48, lamp: false }, anim: { blades: [1, 2] }, view: { pos: [0.8, 1.2, 3.2], target: [0.8, 1.15, 0.3] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const AX = 1.35;                                  // optical axis height (m)
    const dark = M.metal(0x3a3f4a, { roughness: 0.45 }), steel = M.metal(0xb9bec8), black = M.matte(0x15171c);

    // ---------------------------------------------------------------- platters
    const tower = new THREE.Group(); tower.position.set(-1.8, 0, 0); root.add(tower);
    { const post = box(0.12, 1.6, 0.12, dark); post.position.set(0.6, 0.8, 0); tower.add(post); }
    const platY = [0.35, 0.8, 1.25], plats = [], packs = [];
    platY.forEach((y, i) => {
      const arm = box(0.6, 0.05, 0.1, dark); arm.position.set(0.3, y - 0.04, 0); tower.add(arm);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.025, 64), M.metal(0x9aa0aa, { roughness: 0.4 })); p.position.y = y; p.castShadow = p.receiveShadow = true; tower.add(p); plats.push(p);
      const pack = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.4, 64, 1), M.matte(0x3b2616, { side: THREE.DoubleSide })); pack.rotation.x = -Math.PI / 2; pack.position.y = y + 0.05; tower.add(pack); packs.push(pack);
      const packSide = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.035, 64, 1, true), M.matte(0x2a1a10)); packSide.position.y = y + 0.032; tower.add(packSide); pack.side = packSide;
    });
    packs[0].visible = packs[0].side.visible = false;   // the bottom platter is empty, ready for the next film
    const payout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.25, 24), steel); payout.position.set(0, 1.4, 0); tower.add(payout);

    // ---------------------------------------------------------------- projector head, lamphouse, lens
    const head = new THREE.Group(); root.add(head);
    const panel = box(0.62, 1.55, 0.08, dark); panel.position.set(0, 1.28, -0.16); head.add(panel);
    const pedestal = box(0.5, 0.5, 0.5, M.matte(0x2a2e36)); pedestal.position.set(-0.25, 0.25, -0.1); head.add(pedestal);
    const column = box(0.3, 0.3, 0.3, M.matte(0x2a2e36)); column.position.set(-0.25, 0.6, -0.1); head.add(column);
    const sprockets = [];
    for (const [y, r, x] of [[1.85, 0.07, 0.07], [1.08, 0.045, 0.045], [0.78, 0.07, 0.07]]) { const w = wheelZ(r, 0.06, steel, 16); w.position.set(x, y, -0.07); head.add(w); sprockets.push(w); }
    const gateM = box(0.06, 0.2, 0.12, black); gateM.position.set(0.02, AX, -0.05); head.add(gateM);
    const soundY = AX - (SOUND_OFFSET_FRAMES * FRAME_MM) / 1000;
    const sound = box(0.1, 0.07, 0.1, M.matte(0x222630)); sound.position.set(0.06, soundY, -0.05); head.add(sound);
    const soundLed = sphere(0.018, M.glow(0xff4040)); soundLed.position.set(0.02, soundY, 0.0); head.add(soundLed);
    const lens = latheX([[0, 0.075], [0.02, 0.085], [0.38, 0.085], [0.42, 0.07]], M.metal(0x2a2d33)); lens.position.set(0.06, AX, 0); head.add(lens);
    const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.068, 24), M.glow(0xfff4d8)); lensGlass.rotation.y = Math.PI / 2; lensGlass.position.set(0.485, AX, 0); head.add(lensGlass);
    // the main rotary shutter, between the lamp and the gate
    const mShutter = new THREE.Group(); mShutter.position.set(-0.14, AX - 0.24, 0); mShutter.rotation.y = Math.PI / 2; head.add(mShutter);
    // lamphouse with a xenon bulb in an ellipsoidal mirror
    const lampH = new THREE.Group(); lampH.position.set(-0.75, AX, 0); head.add(lampH);
    const shell = box(0.72, 0.62, 0.56, M.matte(0x2e333d, { transparent: true, opacity: 1 })); lampH.add(shell);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 20), M.metal(0x5a606b)); chimney.position.set(0, 0.55, 0); lampH.add(chimney);
    const mirror = latheX(Array.from({ length: 16 }, (_, i) => { const t = i / 15; return [-0.3 + 0.26 * t, 0.25 * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)))]; }), M.metal(0xe8eef6, { roughness: 0.08, side: THREE.DoubleSide }), { seg: 48 });
    lampH.add(mirror);
    const bulb = latheX([[-0.2, 0.012], [-0.1, 0.015], [-0.07, 0.04], [-0.03, 0.045], [0.0, 0.04], [0.03, 0.015], [0.12, 0.012]], M.glass({ color: 0xffffff }), { seg: 24 }); lampH.add(bulb);
    const arc = sphere(0.018, M.glow(0xfff6e0)); arc.position.x = -0.035; lampH.add(arc);
    const beamIn = lightCone(0xfff1c9, 0.1); root.add(beamIn);
    const beamOut = lightCone(0xfff1c9, 0.1); root.add(beamOut);

    // film path, from the middle of the feed platter over the rollers, through the head, back to the take-up platter
    const path = [[-1.8, 1.42, 0], [-1.8, 1.9, 0], [-1.5, 2.1, 0], [-0.4, 2.15, 0], [0.07, 2.05, 0], [0.07, 1.92, -0.03], [0.11, 1.68, -0.02], [0.03, AX + 0.08, -0.02], [0.03, AX - 0.08, -0.02], [0.08, 1.18, -0.02], [0.05, 1.0, -0.02], [0.06, soundY, -0.02], [0.1, 0.72, -0.02], [-0.3, 0.85, 0.35], [-1.1, 0.85, 0.42], [-1.4, 0.85, 0.2]];
    const ftex = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#4a3322'; g.fillRect(0, 0, 64, 8); g.fillStyle = '#c9a26a'; g.fillRect(0, 0, 10, 8); return c; })());
    ftex.wrapS = THREE.RepeatWrapping; ftex.repeat.set(120, 1); ftex.colorSpace = THREE.SRGBColorSpace;
    const filmTube = tube(path, 0.013, M.matte(0xffffff, { map: ftex }), false, 300); root.add(filmTube);

    // ---------------------------------------------------------------- the movement, enlarged 10×
    const mech = new THREE.Group(); mech.position.set(1.4, 1.95, 0.3); mech.scale.setScalar(0.85); root.add(mech);
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.05), M.ghost(0x0b0d12, 0.7)); backing.position.set(0.08, 0.33, -0.2); mech.add(backing);
    const ftx = filmTexture();
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 8 * P * 0.9), new THREE.MeshStandardMaterial({ map: ftx, roughness: 0.6, transparent: true, emissive: 0xffffff, emissiveMap: ftx, emissiveIntensity: 0.25 }));
    ftx.repeat.set(1, 0.9); strip.position.set(0, 0.2, 0); mech.add(strip);
    // gate plate with its window; the lamp glows behind it
    const gatePlate = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.24, -0.13); s.lineTo(0.24, -0.13); s.lineTo(0.24, 0.13); s.lineTo(-0.24, 0.13); s.closePath(); const h = new THREE.Path(); h.moveTo(-0.105, -0.057); h.lineTo(0.105, -0.057); h.lineTo(0.105, 0.057); h.lineTo(-0.105, 0.057); h.closePath(); s.holes.push(h); return s; })()), M.metal(0x2a2d33, { side: THREE.DoubleSide }));
    gatePlate.position.set(0, GATE_Y, 0.012); mech.add(gatePlate);
    const lampGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), M.glow(0xfff1c9, { transparent: true, opacity: 1 })); lampGlow.position.set(0, GATE_Y, -0.03); mech.add(lampGlow);
    const beamM = lightCone(0xfff1c9, 0.22); mech.add(beamM);
    beamM.set([0, GATE_Y, 0.55], [[-0.105, GATE_Y - 0.057, 0.02], [0.105, GATE_Y - 0.057, 0.02], [0.105, GATE_Y + 0.057, 0.02], [-0.105, GATE_Y + 0.057, 0.02]]);
    // the rotary shutter in front of the gate: blades are rebuilt when the count changes
    const shutter = new THREE.Group(); shutter.position.set(-0.25, GATE_Y, 0.08); mech.add(shutter);
    const hubS = wheelZ(0.035, 0.06, M.metal(0x777777)); shutter.add(hubS);
    let bladeMeshes = [], shownN = 0;
    const bladeMat = M.metal(0xc9ced6, { side: THREE.DoubleSide, roughness: 0.3, transparent: true, opacity: 0.93 });
    const setBlades = (N) => {
      if (N === shownN) return; shownN = N;
      bladeMeshes.forEach((b) => { shutter.remove(b); b.geometry.dispose(); });
      const w = (Math.PI) / N;
      bladeMeshes = Array.from({ length: N }, (_, k) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.37, 48, -w / 2 + k * TAU / N, w), bladeMat); shutter.add(m); return m; });
      mShutter.children.forEach((c) => { c.geometry.dispose(); }); mShutter.clear();
      for (let k = 0; k < N; k++) mShutter.add(new THREE.Mesh(new THREE.CircleGeometry(0.33, 32, -w / 2 + k * TAU / N, w), M.metal(0xc9ced6, { side: THREE.DoubleSide })));
    };
    // Geneva drive (behind the film) and the intermittent sprocket (in front, on the same shaft)
    const cross = extrude(crossShape(GA), 0.03, M.metal(0xd6a64a, { roughness: 0.35 })); cross.position.set(...CROSS, -0.08); mech.add(cross);
    const drive = new THREE.Group(); drive.position.set(...DRIVE, -0.12); mech.add(drive);
    const rl = 0.742 * GA;
    const lockShape = new THREE.Shape(); { const cut = 0.9; lockShape.absarc(0, 0, rl, cut, TAU - cut, false); lockShape.absarc(GA * 0.95, 0, GA * 0.62, Math.PI + 1.05, Math.PI - 1.05, true); }
    const lock = extrude(lockShape, 0.03, M.metal(0x8f96a3)); lock.position.z = 0.04; drive.add(lock);
    const driveDisc = wheelZ(GA * 1.15, 0.02, M.metal(0x4a505b)); driveDisc.position.z = -0.03; drive.add(driveDisc);
    const pin = wheelZ(0.018, 0.12, M.glow(0xff7a59)); pin.position.set(GA, 0, 0.04); drive.add(pin);
    const pinArm = box(GA, 0.03, 0.02, M.metal(0x5f6672)); pinArm.position.set(GA / 2, 0, -0.01); drive.add(pinArm);
    const spk = new THREE.Group(); spk.position.set(...CROSS, 0.03); mech.add(spk);
    spk.add(wheelZ(RS - 0.012, 0.03, steel, 32));
    for (let k = 0; k < 16; k++) { const t = box(0.022, 0.03, 0.03, M.metal(0xe0e4ea)); const a = (k / 16) * TAU; t.position.set(Math.cos(a) * (RS - 0.005), Math.sin(a) * (RS - 0.005), 0); t.rotation.z = a; spk.add(t); }
    const shaft = wheelZ(0.02, 0.2, M.metal(0x777777)); shaft.position.set(...CROSS, -0.03); mech.add(shaft);

    // what reaches the screen right now
    const mini = board(mech, 0.66, 0.4, 330, 200, (g, w, h, n = 0, lit = true, fps = 24) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h);
      drawScene(g, w, h - 30, n / fps, { dim: lit ? 1 : 0.02 });
      text(g, lit ? `frame ${n} on the screen` : 'dark: shutter closed', 8, h - 8, { font: 'bold 18px sans-serif', col: lit ? COL.hot : COL.soft });
    }, [0.1, 1.05, 0.02]);

    // flicker board
    const cur = { fps: 24, blades: 2 };
    const flick = board(root, 2.0, 0.95, 840, 400, (g, w, h) => {
      panelBg(g, w, h);
      const f = cur.fps * cur.blades;
      title(g, `${f} flashes of light a second`, `${cur.fps} frames a second × ${cur.blades} blade${cur.blades > 1 ? 's' : ''} · one quarter of a second shown`);
      const x0 = 24, pw = w - 48, span = 0.25, n = cur.fps * span;
      text(g, 'film moving', x0, 118, { font: '16px sans-serif', col: COL.bad });
      text(g, 'light on screen', x0, 178, { font: '16px sans-serif', col: COL.amber });
      for (let i = 0; i < 400; i++) {
        const u = (i / 400) * n, p = u % 1, x = x0 + (i / 400) * pw;
        if (p < PULLDOWN) { g.fillStyle = COL.bad; g.fillRect(x, 124, pw / 400 + 0.6, 16); }
        if (shutterOpen(p, cur.blades)) { g.fillStyle = COL.amber; g.fillRect(x, 184, pw / 400 + 0.6, 30); }
      }
      if (!covered(cur.blades)) text(g, 'Blades narrower than the pulldown: the moving film shows ("travel ghost")', x0, 238, { font: 'bold 16px sans-serif', col: COL.bad });
      // the flicker meter, 0–100 Hz, with the fusion band
      const mx = x0, my = 290, mw = pw, fx = (hz) => mx + (hz / 100) * mw;
      g.fillStyle = 'rgba(255,90,138,.35)'; g.fillRect(mx, my, fx(40) - mx, 22);
      g.fillStyle = 'rgba(255,209,102,.35)'; g.fillRect(fx(40), my, fx(50) - fx(40), 22);
      g.fillStyle = 'rgba(123,224,140,.35)'; g.fillRect(fx(50), my, mx + mw - fx(50), 22);
      g.fillStyle = '#fff'; g.fillRect(fx(f) - 3, my - 8, 6, 38);
      text(g, 'you see flicker', mx + 6, my + 52, { font: '16px sans-serif', col: COL.bad });
      text(g, '40–50 Hz', fx(45), my + 52, { font: '16px sans-serif', col: COL.hot, align: 'center' });
      text(g, 'looks steady (see EyeClear)', mx + mw - 4, my + 52, { font: '16px sans-serif', col: COL.green, align: 'right' });
      [0, 24, 48, 72, 100].forEach((hz) => text(g, `${hz}`, fx(hz), my - 12, { font: '14px sans-serif', col: COL.soft, align: 'center' }));
    }, [1.18, 0.72, 0.35]); flick.mesh.scale.setScalar(1.12);

    const L = (t, pos, parent = root, cls = '') => stage.label(t, pos, parent, cls);
    const labels = {
      feed: L('Feed platter', [-1.8, 1.4, 0.6]), take: L('Take-up platter', [-1.8, 0.92, 0.55]),
      lamp: L('Xenon lamp', [-0.75, AX + 0.45, 0.3], root, 'hot'), shut: L('Shutter', [-0.14, AX - 0.62, 0.1]), gate: L('Gate', [0.0, AX + 0.2, 0.15]),
      lens: L('Lens', [0.4, AX + 0.16, 0]), sound: L('Sound reader', [0.35, soundY, 0.05]),
      cross: L('Maltese cross', [CROSS[0] + 0.4, -0.34, 0], mech, 'hot'), pin: L('Drive pin', [DRIVE[0] + 0.15, 0.3, 0], mech), spk: L('Sprocket', [-0.05, -0.22, 0.05], mech),
      shutM: L('Shutter blades', [-0.5, GATE_Y + 0.42, 0.1], mech), gateM: L('Gate', [0.3, GATE_Y + 0.12, 0.05], mech), big: L('Movement, 10× bigger', [0.1, 1.4, 0], mech),
    };
    const minor = [labels.take, labels.shut, labels.sound, labels.pin, labels.gateM, labels.spk, labels.shutM, labels.big, labels.gate, labels.lens];

    // light cones: lamp mirror to gate, and lens to the screen
    beamIn.set([-0.93, AX, 0], [[-0.02, AX - 0.03, -0.03], [-0.02, AX - 0.03, 0.03], [-0.02, AX + 0.03, 0.03], [-0.02, AX + 0.03, -0.03]]);
    beamOut.set([0.49, AX, 0], [[1.0, AX - 0.06, -0.1], [1.0, AX - 0.06, 0.1], [1.0, AX + 0.06, 0.1], [1.0, AX + 0.06, -0.1]]);

    let u = 0, lastKey = '', lastMini = '';
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, minor, -0.16);
        reelBoards([[flick, [0.35, 0.05, 0.6], 1.2]]);
        setBlades(s.blades);
        u += (dt * s.fps) / s.slow;                     // frames of film time
        const fp = filmPos(u), p = fp.p;
        const lit = shutterOpen(p, s.blades);
        // Geneva: drive angle, cross angle, sprocket and film
        const g = geneva(fp.theta);
        const crossRot = fp.n * Math.PI / 2 + (p < PULLDOWN ? g.phi : Math.PI / 4);
        drive.rotation.z = Math.PI - fp.theta;
        cross.rotation.z = crossRot;
        spk.rotation.z = crossRot;
        ftx.offset.y = ((fp.pos * P) / (8 * P * 0.9)) * 0.9 % 1;
        shutter.rotation.z = -(p - PULLDOWN / 2) * TAU;
        mShutter.rotation.z = -(p - PULLDOWN / 2) * TAU;
        sprockets.forEach((w, i) => { w.rotation.y = i === 1 ? -crossRot : -u * 0.6; });
        // the continuous parts of the film path flow steadily
        ftex.offset.x = -u * 0.05;
        plats[1].rotation.y = packs[1].rotation.z = -u * 0.02; plats[2].rotation.y = packs[2].rotation.z = u * 0.02;
        // light: at real speed the eye sees the average; slowed, you see each flash
        const slowLit = s.slow === 1 ? 0.5 : lit ? 1 : 0;
        lampGlow.material.opacity = 1;
        beamM.material.opacity = 0.25 * slowLit;
        beamOut.material.opacity = 0.03 + 0.12 * slowLit;
        beamIn.material.opacity = 0.14;
        shell.material.opacity = s.lamp ? 0.14 : 1; shell.material.depthWrite = !s.lamp;
        arc.scale.setScalar(1 + 0.08 * Math.sin(time * 40));
        labels.lamp.visible = true;
        const k = `${s.fps}|${s.blades}`; if (k !== lastKey) { lastKey = k; cur.fps = s.fps; cur.blades = s.blades; flick.redraw(); }
        const mk = `${fp.n}|${s.slow === 1 ? 1 : lit}`; if (mk !== lastMini) { lastMini = mk; mini.redraw(fp.n, s.slow === 1 || lit, s.fps); }
      },
      readout: (s) => {
        const f = s.fps * s.blades, frame = 1000 / s.fps, pull = frame * PULLDOWN;
        const verdict = f >= 50 ? '<div class="ok">Looks steady to almost everyone.</div>' : f >= 40 ? '<div class="ok">Steady for most people at cinema brightness.</div>' : '<div class="no">Strong flicker: the eye sees each flash.</div>';
        return `<div class="big">${f} flashes a second</div>
          <div class="row"><span>Film moves for</span><b>${pull.toFixed(1)} ms of each ${frame.toFixed(1)} ms frame</b></div>
          <div class="row"><span>Frame held still</span><b>${(frame - pull).toFixed(1)} ms</b></div>
          <div class="row"><span>Film speed</span><b>${(s.fps * FRAME_MM / 1000).toFixed(2)} m/s · ${s.fps * 60 / FRAMES_PER_FOOT} ft/min</b></div>
          <div class="row"><span>A 2-hour film</span><b>${(s.fps * 7200 / FRAMES_PER_FOOT).toLocaleString('en-US')} ft · ${(s.fps * 7200 * FRAME_MM / 1e6).toFixed(1)} km</b></div>
          ${covered(s.blades) ? '' : '<div class="no">Blades narrower than the pulldown: travel ghost.</div>'}${verdict}`;
      },
    };
  },
};
