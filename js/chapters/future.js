// Chapter 6: big formats and the future: IMAX film and laser, premium large formats, high frame rates,
// LED cinema screens, and India's move from single screens to multiplexes.
//  - IMAX 15/70: 15 perforations per frame on 70 mm film running sideways, frame 69.6 × 48.5 mm, 102.7 m of
//    film a minute at 24 fps; a 2.5-hour film on its platter weighs about 250 kg; IMAX with Laser from
//    December 2014 (Wikipedia "IMAX"). 15 kW xenon lamps (Wikipedia "Movie projector").
//  - 35 mm flat projection aperture about 20.96 × 11.33 mm; 5/70 (70 mm) about 48.5 × 22.1 mm (SMPTE; Wikipedia
//    "70 mm film"). 4K DMD flat area ≈ 30 × 16 mm (see projector.js).
//  - High frame rate: The Hobbit: An Unexpected Journey (2012) at 48 fps; Billy Lynn's Long Halftime Walk (2016)
//    and Gemini Man (2019) shot at 120 fps; Avatar: The Way of Water (2022) used 48 fps in many scenes.
//  - LED cinema: Samsung Onyx, first at Lotte Cinema World Tower, Seoul, 2017, about 10.3 m wide, DCI-compliant
//    (Samsung Newsroom). Samsung says its peak brightness is far above projection.
//  - India: roughly 12,000–13,000 single screens in the 1980s (a rough figure quoted by Forbes India); 10,033
//    screens of all kinds in 2025 (FICCI-EY 2026 report, via Forbes India).
//  - Screen sizes for PLF and IMAX below are examples, not specifications: sizes vary a lot by venue.
import { THREE, M, box, clamp } from '../kit.js';
import { board, panelBg, title, text, wrap, COL, drawScene, fitNarrow, reelBoards, lightCone, makeSeats, makePerson, makeDigitalProjector, FRAME_MM } from '../projector.js';

export const FORMATS = {
  std: { name: 'Standard', W: 12, ratio: 1.85, light: 'xenon or laser, one 2K/4K projector', frame: 'd4k', note: 'A typical multiplex screen, around 10 to 14 m wide.' },
  plf: { name: 'Premium large', W: 20, ratio: 1.9, light: 'laser, often two projectors', frame: 'd4k', note: 'Wall-to-wall screens with extra light and sound, sold under names like Dolby Cinema, IMAX or a chain’s own brand. Size here is an example.' },
  imaxfilm: { name: 'IMAX 15/70 film', W: 22, ratio: 1.43, light: '15 kW xenon, film running sideways', frame: 'i1570', note: 'Each frame is 15 perforations wide on 70 mm film, about ten times the area of 35 mm. The film races through at 102.7 m a minute. Size is an example.' },
  laser: { name: 'IMAX laser', W: 22, ratio: 1.43, light: 'two 4K laser projectors', frame: 'd4k', note: 'Since 2014, pairs of laser projectors replace the film in the biggest IMAX halls.' },
  led: { name: 'LED screen', W: 10.3, ratio: 1.9, light: 'no projector: the screen glows', frame: 'led', note: 'Samsung Onyx (2017) was the first cinema LED screen: millions of LEDs that make their own light, with true black.' },
};
const FRAMES = [
  { id: 'f35', name: '35 mm flat', w: 20.96, h: 11.33, col: '#ffb547' },
  { id: 'd4k', name: '4K mirror chip', w: 29.97, h: 16.2, col: '#8ef0ff' },
  { id: 'f570', name: '70 mm (5/70)', w: 48.5, h: 22.1, col: '#c49bff' },
  { id: 'i1570', name: 'IMAX 15/70', w: 69.6, h: 48.5, col: '#ff7ab6' },
];
const IMAX_M_PER_MIN = 102.7, F35_M_PER_MIN = (24 * 60 * FRAME_MM) / 1000;

export default {
  id: 'future',
  short: 'Big formats and the future',
  title: 'Giant screens, faster frames and screens that glow',
  subtitle: 'IMAX, premium formats, high frame rates, lasers, LED walls, and the changing Indian cinema hall.',
  view: { pos: [-33, 13, 17], target: [0, 8, 13] },
  learn: `<p>To pull people away from home screens, cinemas went <b>bigger</b>. <b>IMAX</b> began in 1970 with film <b>70 mm wide running sideways</b>, each frame <b>15 perforations</b> long: about ten times the area of a 35 mm frame. A 2.5-hour film on its platter weighs about <b>250 kg</b>. Since 2014, the biggest IMAX halls use pairs of <b>laser</b> projectors instead. <b>Premium large formats</b> (Dolby Cinema, IMAX and chains’ own brands) add wall-to-wall screens, laser light and stronger sound.</p>
    <p>Some directors tried <b>high frame rates</b>. <i>The Hobbit</i> (2012) played at <b>48 fps</b>; <i>Gemini Man</i> (2019) was shot at <b>120 fps</b>. More frames mean smoother motion and less blur, but some viewers found it looked like video. <i>Avatar: The Way of Water</i> (2022) switched to 48 fps only in some scenes.</p>
    <p>The newest screens need <b>no projector at all</b>. An <b>LED cinema screen</b>, such as Samsung’s Onyx (2017), is a wall of tiny lights like a giant TV (see TVClear), with true black. In India, where roughly 12,000 to 13,000 <b>single-screen</b> halls once stood (a rough 1980s figure), about <b>10,000 screens</b> were counted in 2025. Many old halls closed as <b>multiplexes</b> grew.</p>
    <p class="tip"><b>Try it:</b> switch formats and compare the screen with the person at the front. Then set 120 fps and compare the ball’s motion with 24.</p>`,
  terms: [
    { t: 'IMAX 15/70', d: 'IMAX film format: 70 mm film running sideways, 15 perforations per frame.' },
    { t: 'Premium large format', d: 'A bigger, brighter, louder hall that costs a little more per ticket.' },
    { t: 'High frame rate (HFR)', d: 'Showing more than 24 frames a second, such as 48 or 120, for smoother motion.' },
    { t: 'Laser projection', d: 'Projectors lit by lasers instead of a lamp: brighter, purer colours, and long-lasting.' },
    { t: 'LED cinema screen', d: 'A screen made of LEDs that shine by themselves, so no projector is needed.' },
    { t: 'Multiplex', d: 'A cinema with several screens under one roof, usually in a mall.' },
  ],
  defaults: { fmt: 'std', fps: 24 },
  controls: [
    { key: 'fmt', type: 'seg', label: 'Format', options: Object.entries(FORMATS).map(([v, m]) => ({ v, label: m.name })) },
    { key: 'fps', type: 'seg', label: 'Frame rate', options: [{ v: 24, label: '24 fps' }, { v: 48, label: '48 fps' }, { v: 120, label: '120 fps' }], fmt: (v) => `${(1000 / v).toFixed(1)} ms per frame` },
  ],
  quiz: [
    { q: 'How does IMAX 15/70 film get such a big frame?', options: ['It uses 35 mm film zoomed in', 'It runs 70 mm film sideways, with each frame 15 perforations long', 'It uses two films at once', 'It has no film'], answer: 1, why: 'Running sideways lets each frame be 69.6 mm wide, about ten times the area of a 35 mm frame.' },
    { q: 'What was different about The Hobbit (2012) in many cinemas?', options: ['It was in black and white', 'It was shown at 48 frames per second', 'It had no sound', 'It was projected on the ceiling'], answer: 1, why: 'It was the first big release in high frame rate, 48 fps, twice the usual 24.' },
    { q: 'How does an LED cinema screen make its picture?', options: ['A projector behind it', 'Millions of LEDs in the screen give off their own light', 'Mirrors in the ceiling', 'It reflects the room lights'], answer: 1, why: 'Like a giant TV, each pixel is a light. There is no projector, lamp or lens.' },
  ],
  reel: [
    { ms: 5200, caption: 'IMAX film runs 70 mm sideways: each frame is about ten times a 35 mm frame.', set: { fps: 24 }, anim: { fmt: ['std', 'imaxfilm'] }, view: { pos: [-33, 13, 17], target: [0, 8, 13] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const floor = box(46, 0.1, 28, M.matte(0x2a1f28)); floor.position.set(0, -0.05, 12); root.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(46, 20), M.matte(0x16141c)); wall.position.set(0, 10, -0.08); root.add(wall);
    const seats = makeSeats({ rows: 14, cols: 34, pitch: 1.1, rise: 0.35, z0: 6 }); root.add(seats);
    const person = makePerson({ shirt: 0xffb547 }); person.position.set(3, 0, 2.5); root.add(person);
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400; const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const scrMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), scrMat); root.add(scr);
    const ledGrid = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 16, 16); g.clearRect(2, 2, 12, 12); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(120, 60); return t; })() }));
    root.add(ledGrid);
    const proj = makeDigitalProjector({}); proj.scale.setScalar(2); proj.position.set(0.3, 9.2, 23); root.add(proj);
    const proj2 = makeDigitalProjector({}); proj2.scale.setScalar(2); proj2.position.set(2.6, 9.2, 23); root.add(proj2);
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 48), M.matte(0x3b2616)); platter.position.set(-2.6, 9.6, 23.5); root.add(platter);
    const cone = lightCone(0xf4f8ff, 0.07); root.add(cone);
    const booth = box(8, 0.3, 3.5, M.matte(0x22252c)); booth.position.set(0, 8.5, 23.4); root.add(booth);
    const cur = { W: 12, H: 12 / 1.85 };
    // board: frame sizes to scale, and frame-rate sampling
    const bd = board(root, 9, 6.2, 800, 552, (g, w, h) => {
      panelBg(g, w, h);
      const s = cur.s; if (!s) return;
      const F = FORMATS[s.fmt];
      title(g, 'What makes each picture', 'frames drawn to scale (mm), and one moving ball sampled over 1/4 s');
      const sc = 4.4, x0 = 24, y0 = 100;
      let x = x0;
      FRAMES.forEach((f) => {
        const on = f.id === F.frame || (F.frame === 'd4k' && f.id === 'd4k');
        g.strokeStyle = f.col; g.lineWidth = on ? 4 : 1.5; g.fillStyle = on ? 'rgba(255,255,255,.08)' : 'transparent';
        const wpx = f.w * sc * 0.55, hpx = f.h * sc * 0.55;
        g.fillRect(x, y0 + 130 - hpx, wpx, hpx); g.strokeRect(x, y0 + 130 - hpx, wpx, hpx);
        text(g, f.name, x, y0 + 152, { font: `${on ? 'bold ' : ''}14px sans-serif`, col: f.col });
        text(g, `${f.w}×${f.h}`, x, y0 + 170, { font: '13px sans-serif', col: COL.soft });
        x += wpx + 26;
      });
      if (F.frame === 'led') text(g, 'LED screen: no frame, no projector', x0, y0 + 196, { font: 'bold 16px sans-serif', col: COL.cyan });
      // frame-rate sampling
      const sy = 330, sw = w - 48;
      text(g, `${s.fps} fps: ${Math.round(s.fps / 4)} pictures of the ball in 1/4 second`, x0, sy - 14, { font: 'bold 18px sans-serif', col: COL.text });
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x0, sy, sw, 60);
      const n = Math.round(s.fps / 4);
      for (let i = 0; i < n; i++) { const k = i / (n - 1 || 1), bx = x0 + 20 + k * (sw - 40); g.fillStyle = `rgba(255,122,42,${0.35 + 0.65 * k})`; g.beginPath(); g.arc(bx, sy + 30, 12, 0, Math.PI * 2); g.fill(); }
      text(g, `gap between pictures: ${((sw - 40) / (n - 1 || 1) / (sw - 40) * 100).toFixed(0)}% of the path · ${(s.fps / 24).toFixed(s.fps % 24 ? 1 : 0)}× the frames and data of 24 fps`, x0, sy + 90, { font: '15px sans-serif', col: COL.soft });
      wrap(g, F.note, x0, sy + 128, sw, 22, { font: '16px sans-serif', col: COL.text });
      text(g, 'India: about 12,000–13,000 single screens in the 1980s (rough); 10,033 screens of all kinds in 2025 (FICCI-EY).', x0, h - 18, { font: '14px sans-serif', col: COL.soft });
    }, [0, 15.5, 20.5]); bd.mesh.scale.setScalar(1.25);
    bd.mesh.rotation.y = -Math.PI / 2 + 0.2;
    const L = { scr: stage.label('', [0, 0, 0], root, 'hot'), person: stage.label('1.75 m person', [3, 2.2, 2.5], root), booth: stage.label('', [0, 11.3, 23], root) };
    let t = 0, lastK = '';
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fitNarrow(stage, [L.booth, L.person], -0.08);
        reelBoards([[bd, [0, 18, 13], 1.7, [0, -Math.PI / 2 + 0.2, 0]]]);
        const F = FORMATS[s.fmt] || FORMATS.std;
        const W = F.W, H = W / F.ratio;
        cur.W += (W - cur.W) * clamp(dt * 4, 0, 1); cur.H += (H - cur.H) * clamp(dt * 4, 0, 1);
        const yc = 1.0 + cur.H / 2;
        scr.scale.set(cur.W, cur.H, 1); scr.position.set(0, yc, 0);
        ledGrid.visible = s.fmt === 'led'; ledGrid.scale.copy(scr.scale); ledGrid.position.set(0, yc, 0.02);
        const noProj = s.fmt === 'led';
        proj.visible = !noProj && s.fmt !== 'imaxfilm'; proj2.visible = s.fmt === 'plf' || s.fmt === 'laser';
        platter.visible = s.fmt === 'imaxfilm'; cone.visible = !noProj;
        cone.set([0, 10.1, 21.8], [[-cur.W / 2, yc - cur.H / 2, 0.03], [cur.W / 2, yc - cur.H / 2, 0.03], [cur.W / 2, yc + cur.H / 2, 0.03], [-cur.W / 2, yc + cur.H / 2, 0.03]]);
        // the picture: samples the moving ball at the chosen frame rate
        const ft = Math.floor(t * s.fps) / s.fps;
        drawScene(ctx, 640, 400, ft * 0.8);
        tex.needsUpdate = true;
        L.scr.element.textContent = `${F.name}: ${W.toFixed(1)} × ${H.toFixed(1)} m`;
        L.scr.position.set(cur.W / 2 + 0.5, yc + cur.H / 2 + 0.8, 0);
        L.booth.element.textContent = noProj ? '' : `Booth: ${F.light}`; L.booth.visible = !noProj && !narrow;
        cur.s = s;
        const k = `${s.fmt}|${s.fps}`; if (k !== lastK) { lastK = k; bd.redraw(); }
        void time;
      },
      readout(s) {
        const F = FORMATS[s.fmt], W = F.W, H = W / F.ratio, area = W * H, std = 12 * 12 / 1.85;
        const filmM = s.fmt === 'imaxfilm' ? IMAX_M_PER_MIN * 120 : F35_M_PER_MIN * 120;
        return `<div class="big">${F.name}</div>
          <div class="row"><span>Screen (example)</span><b>${W.toFixed(1)} × ${H.toFixed(1)} m, ${(area / std).toFixed(1)}× a standard screen</b></div>
          <div class="row"><span>Light</span><b>${F.light}</b></div>
          <div class="row"><span>${s.fmt === 'imaxfilm' ? 'IMAX film for 2 hours' : '35 mm film for 2 hours (if it were film)'}</span><b>${(filmM / 1000).toFixed(1)} km</b></div>
          <div class="row"><span>Frame rate</span><b>${s.fps} fps · ${(1000 / s.fps).toFixed(1)} ms a frame · ${(s.fps / 24).toFixed(s.fps % 24 ? 1 : 0)}× the data</b></div>`;
      },
    };
  },
};
