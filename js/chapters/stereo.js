// Chapter 4: 3D projection. One projector alternates left-eye and right-eye pictures (triple flash:
// L R L R L R per frame = 144 flashes a second at 24 fps), and the glasses make sure each eye only
// gets its own.
//  - Polarised (the principle behind RealD-style systems): a switching polariser in front of the lens gives
//    left and right pictures opposite circular polarisation; passive glasses have matching filters. Needs a
//    silver screen, because matte white scrambles polarisation (Wikipedia "Polarized 3D system", "RealD 3D").
//  - Active shutter: liquid-crystal glasses darken each eye in turn, synced by an infrared or radio signal
//    (Wikipedia "Active shutter 3D system"). Works on a white screen.
//  - Colour (wavelength) filter, e.g. Dolby 3D: each eye gets slightly different red, green and blue bands;
//    a filter wheel in the projector and interference-filter glasses (Wikipedia "Dolby 3D"). White screen.
//  - Light loss: each eye sees its picture only half the time, and filters and polarisers absorb more.
//    The shares below are rough estimates from typical component transmissions (time share 0.5 × filter
//    chain), not measurements; many 3D shows reached only about 3–5 fL against 14 fL for 2D, and DCI later
//    recommended 3D near 2D brightness for laser projectors (mkpe report on DCI, 2015).
import { THREE, M, box, clamp, sphere } from '../kit.js';
import { DCI_FL, board, panelBg, title, text, wrap, COL, drawScene, fitNarrow, reelBoards, lightCone, makePerson, makeDigitalProjector } from '../projector.js';

export const METHODS = {
  polar: { name: 'Polarised', short: 'Polarised glasses', chain: 0.4 * 0.85, how: 'A switching polariser twists left pictures one way and right pictures the other. Each lens of the glasses lets only one twist through.' },
  active: { name: 'Active shutter', short: 'Shutter glasses', chain: 0.32, how: 'The glasses have tiny liquid-crystal shutters. A signal from the projector darkens the right eye during left pictures, and the left eye during right pictures.' },
  colour: { name: 'Colour filter', short: 'Colour-filter glasses', chain: 0.25, how: 'Left and right pictures use slightly different shades of red, green and blue. Each lens is a filter that passes only its own set of shades.' },
};
const LCOL = 0xffb547, RCOL = 0x38d4ff;
// Share of the 2D light that reaches one eye (rough estimate): half the time × the filter chain.
export const eyeShare = (m) => 0.5 * METHODS[m].chain;

export default {
  id: 'stereo',
  short: '3D projection',
  title: 'Two pictures, one screen, two eyes',
  subtitle: 'A 3D film is two films at once. The glasses decide which eye gets which picture.',
  view: { pos: [8.5, 5.6, 16.5], target: [-0.3, 3.4, 4.5] },
  learn: `<p>Your two eyes are about <b>6.5 cm apart</b>, so each sees the world from a slightly different place. Your brain uses the difference to feel depth. A <b>3D film</b> is filmed or rendered twice, once for each eye, and the cinema must get the <b>left picture only to your left eye</b> and the right one only to your right eye.</p>
    <p>Most cinemas use <b>one projector</b> that alternates: left, right, left, right, three times per frame. That is <b>144 flashes a second</b>, too fast to notice. The glasses sort them out in one of three ways. <b>Polarised</b> glasses (the idea behind RealD-style systems) have filters that pass only light twisted one way. They need a <b>silver screen</b>, because a matte white screen scrambles the twist. <b>Active shutter</b> glasses blink each eye shut in turn. <b>Colour-filter</b> glasses (Dolby 3D is one) pass slightly different shades of red, green and blue to each eye.</p>
    <p>The catch is <b>light</b>. Each eye sees its picture only half the time, and every filter swallows more. Roughly <b>a fifth or less</b> of the 2D light reaches each eye, so many 3D shows looked dim. Newer <b>laser</b> projectors have enough light to fix this. How the eye and brain fuse the two views is in EyeClear.</p>
    <p class="tip"><b>Try it:</b> slow it down and watch the flashes. Take the glasses off to see the double picture. With polarised glasses, switch to a white screen and watch each eye get both pictures.</p>`,
  terms: [
    { t: 'Stereoscopic', d: 'Showing a slightly different picture to each eye so the brain sees depth.' },
    { t: 'Triple flash', d: 'Showing each left and right frame three times: L R L R L R, 144 flashes a second at 24 fps.' },
    { t: 'Circular polarisation', d: 'Light whose wave twists as it travels, clockwise or anticlockwise. Filters can tell the two apart.' },
    { t: 'Active shutter glasses', d: 'Glasses with liquid-crystal lenses that turn dark and clear in time with the projector.' },
    { t: 'Crosstalk (ghosting)', d: 'When a bit of one eye’s picture leaks into the other eye, making faint double edges.' },
    { t: 'Silver screen', d: 'A metallic screen that keeps light’s polarisation, needed for polarised 3D.' },
  ],
  defaults: { method: 'polar', glasses: true, slow: 40, silver: true },
  controls: [
    { key: 'method', type: 'seg', label: '3D system', options: Object.entries(METHODS).map(([v, m]) => ({ v, label: m.name })) },
    { key: 'glasses', type: 'toggle', label: 'Wear the glasses' },
    { key: 'silver', type: 'toggle', label: 'Silver screen', hint: 'Off means matte white. Only polarised 3D cares.' },
    { key: 'slow', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real' }, { v: 40, label: '40× slower' }, { v: 200, label: '200× slower' }], fmt: (v) => (v === 1 ? '144 flashes a second' : `${(144 / v).toFixed(1)} flashes a second`) },
  ],
  quiz: [
    { q: 'Why do polarised 3D cinemas need a silver screen?', options: ['It is brighter for 2D', 'A matte white screen scrambles the polarisation, so the glasses can no longer separate the pictures', 'Silver is cheaper', 'It makes the picture bigger'], answer: 1, why: 'The glasses sort left from right by the twist of the light. Matte white scatters light and loses that twist; a metallic silver surface keeps it.' },
    { q: 'At 24 fps with triple flash, how many flashes of light hit the screen each second?', options: ['24', '48', '72', '144'], answer: 3, why: '24 frames × 2 eyes × 3 flashes = 144 a second.' },
    { q: 'Why does a 3D film look darker than 2D through the glasses?', options: ['3D films are graded darker on purpose', 'Each eye sees its picture only half the time, and the filters absorb more light', 'The lens is smaller', 'The projector runs slower'], answer: 1, why: 'Time-sharing halves the light, and polarisers, shutters or colour filters absorb much of the rest: roughly a fifth or less reaches each eye.' },
  ],
  reel: [
    { ms: 5200, caption: 'A 3D projector flashes left and right pictures in turn, 144 times a second.', set: { method: 'polar', glasses: false, silver: true, slow: 40 }, view: { pos: [8.5, 5.6, 16.5], target: [-0.3, 3.4, 4.5] }, spin: 0.3 },
    { ms: 5200, caption: 'The glasses let each eye see only its own picture, but only a fifth of the light gets through.', set: { method: 'active', glasses: true, silver: false, slow: 40 }, view: { pos: [2.4, 3.2, 10.5], target: [0, 3.4, 3.5] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const SW = 6.4, SH = SW / 1.85, SY = 1.2 + SH / 2, PZ = 11, PY = 3.4;
    const floor = box(10, 0.1, 13, M.matte(0x2a1f28)); floor.position.set(0, -0.05, 5.5); root.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), M.matte(0x16141c)); wall.position.set(0, 4.5, -0.06); root.add(wall);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 277; const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const scrMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.7, roughness: 0.6, metalness: 0 });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), scrMat); scr.position.set(0, SY, 0); root.add(scr);
    const proj = makeDigitalProjector({}); proj.position.set(0.12, PY - 0.28, PZ + 0.85); root.add(proj);
    const standP = box(1.4, PY - 0.9, 1.6, M.matte(0x22252c)); standP.position.set(0.1, (PY - 0.9) / 2, PZ + 0.85); root.add(standP);
    const lensZ = PZ, lensP = [0, PY, lensZ];
    const cone = lightCone(0xffffff, 0.07); root.add(cone);
    cone.set(lensP, [[-SW / 2, SY - SH / 2, 0.02], [SW / 2, SY - SH / 2, 0.02], [SW / 2, SY + SH / 2, 0.02], [-SW / 2, SY + SH / 2, 0.02]]);
    // devices on the projector for each system
    const modulator = box(0.5, 0.5, 0.04, M.clear(0x9fd8ff, 0.5)); modulator.position.set(0, PY, lensZ - 0.15); root.add(modulator);
    const wheel = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), M.plastic(0xffffff, { side: THREE.DoubleSide, vertexColors: false })); wheel.position.set(0, PY + 0.05, lensZ - 0.15); root.add(wheel);
    const wheelL = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32, 0, Math.PI), M.glow(LCOL, { side: THREE.DoubleSide })), wheelR = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32, Math.PI, Math.PI), M.glow(RCOL, { side: THREE.DoubleSide }));
    wheel.add(wheelL, wheelR); wheelL.position.z = wheelR.position.z = 0.005;
    const emitter = box(0.25, 0.12, 0.12, M.matte(0x111111)); emitter.position.set(0.6, PY + 0.45, lensZ + 0.3); root.add(emitter);
    const irLed = sphere(0.04, M.glow(0xff3050)); irLed.position.set(0.6, PY + 0.45, lensZ + 0.23); root.add(irLed);
    // the viewer: a big head with glasses, looking at the screen
    const viewer = makePerson({ sit: true, shirt: 0x3b6fd8 }); viewer.position.set(0, 0, 5.2); viewer.rotation.y = Math.PI; root.add(viewer);
    const H = viewer.head.position.y, eyeZ = 5.2 - 0.12;
    const glassesG = new THREE.Group(); glassesG.position.set(0, H + 0.02, eyeZ - 0.02); root.add(glassesG);
    const lensGeo = new THREE.PlaneGeometry(0.1, 0.07);
    const lensL = new THREE.Mesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.3, side: THREE.DoubleSide })); lensL.position.x = -0.055;
    const lensR = new THREE.Mesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.3, side: THREE.DoubleSide })); lensR.position.x = 0.055;
    const bridge = box(0.22, 0.012, 0.012, M.matte(0x111111)); bridge.position.y = 0.035;
    glassesG.add(lensL, lensR, bridge);
    // light packets: projector → screen → eyes. Left pictures amber, right pictures cyan.
    const NP = 36, packets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), M.glow(0xffffff), NP);
    packets.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3); packets.frustumCulled = false; root.add(packets);
    const o = new THREE.Object3D(), col = new THREE.Color();

    // board: what each eye sees + the light budget
    const cur = {};
    const eyes = board(root, 4.4, 2.9, 760, 500, (g, w, h) => {
      panelBg(g, w, h);
      const s = cur.s; if (!s) return;
      const m = METHODS[s.method];
      title(g, s.glasses ? `Through ${m.short.toLowerCase()}` : 'No glasses: both eyes see both pictures', m.how.length > 0 && s.glasses ? '' : 'the picture looks doubled and blurry');
      if (s.glasses) wrap(g, m.how, 24, 76, w - 48, 22, { font: '17px sans-serif', col: COL.soft });
      const pw = (w - 72) / 2, ph = pw / 1.85, y0 = 150;
      const img = document.createElement('canvas'); img.width = Math.round(pw); img.height = Math.round(ph); const ig = img.getContext('2d');
      ['Left eye', 'Right eye'].forEach((lab, i) => {
        const x = 24 + i * (pw + 24), me = i === 0 ? -1 : 1, rec = cur.recv[i];
        ig.clearRect(0, 0, img.width, img.height);
        // own picture, plus the other eye's picture as a ghost if it leaks through
        drawScene(ig, img.width, img.height, cur.film, { eye: me, dim: clamp(rec.own * 3, 0.1, 1) });
        g.drawImage(img, x, y0);
        if (rec.other > 0.01) { g.globalAlpha = clamp(rec.other / Math.max(rec.own, 0.01), 0, 1) * 0.5; drawScene(ig, img.width, img.height, cur.film, { eye: -me }); g.drawImage(img, x, y0); g.globalAlpha = 1; }
        text(g, lab, x, y0 + ph + 26, { font: 'bold 18px sans-serif', col: i ? '#38d4ff' : '#ffb547' });
        text(g, rec.other > 0.01 ? 'gets both pictures: ghosting' : 'only its own picture', x, y0 + ph + 50, { font: '16px sans-serif', col: rec.other > 0.01 ? COL.bad : COL.green });
      });
      // light budget bar
      const share = s.glasses ? eyeShare(s.method) : 1;
      const by = h - 64, bw = w - 48;
      text(g, `Light reaching each eye: about ${Math.round(share * 100)}% of 2D (rough estimate)`, 24, by - 12, { font: 'bold 18px sans-serif', col: COL.text });
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(24, by, bw, 22);
      g.fillStyle = COL.amber; g.fillRect(24, by, bw * share, 22);
      text(g, `${(DCI_FL * share).toFixed(1)} fL if 2D is set to 14 fL`, 24, by + 46, { font: '16px sans-serif', col: COL.soft });
    }, [3.4, 6.75, 2.0]); eyes.mesh.scale.setScalar(1.35);
    eyes.mesh.rotation.y = -0.4;

    const L = {
      proj: stage.label('One projector', [0, PY + 0.8, PZ + 0.5], root, 'hot'), dev: stage.label('', [0, PY - 0.55, lensZ - 0.2], root),
      scr: stage.label('', [SW / 2 - 0.6, SY - SH / 2 - 0.35, 0.1], root), you: stage.label('You, wearing the glasses', [0.9, H + 0.4, 5.2], root),
    };
    let u = 0, lastEye = -1, t = 0, lastK = '';
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); t += dt;
        fitNarrow(stage, [L.dev, L.you], -0.1);
        reelBoards([[eyes, [0, 7.2, 0.3], 1.1]]);
        u += (dt * 144) / s.slow;                       // flashes elapsed
        const flash = Math.floor(u), eye = flash % 2;    // 0 = left, 1 = right
        const real = s.slow === 1;
        // devices
        modulator.visible = s.method === 'polar'; wheel.visible = s.method === 'colour'; emitter.visible = irLed.visible = s.method === 'active';
        modulator.material.color.setHex(real ? 0xcfe8ff : eye ? RCOL : LCOL);
        wheel.rotation.z = -u * Math.PI;
        irLed.material.color.setHex(real || Math.floor(u * 2) % 2 ? 0xff3050 : 0x401018);
        L.dev.element.textContent = s.method === 'polar' ? 'Switching polariser' : s.method === 'colour' ? 'Colour filter wheel' : 'Sync emitter';
        L.dev.position.set(s.method === 'active' ? 0.6 : 0, PY + (s.method === 'active' ? 0.75 : -0.55), lensZ - 0.2);
        const scrambles = s.method === 'polar' && !s.silver;
        L.scr.element.textContent = s.silver ? 'Silver screen' : 'Matte white screen';
        L.scr.element.classList.toggle('hot', scrambles);
        scrMat.metalness = s.silver ? 0.5 : 0; scrMat.roughness = s.silver ? 0.35 : 0.9;
        glassesG.visible = s.glasses; L.you.element.textContent = s.glasses ? 'You, wearing the glasses' : 'You, no glasses';
        // what each eye receives right now (own picture, other picture), 0…1 of the light on the screen
        const pass = (lensEye, picEye) => {
          if (!s.glasses) return 1;
          const T = s.method === 'polar' ? 0.85 * 0.4 * 2 : s.method === 'active' ? 0.32 * 2 : 0.25 * 2; // per-flash transmission ×2 so time-averaging gives eyeShare
          if (s.method === 'active') return lensEye === picEye ? T : 0;
          if (scrambles) return T * 0.5;                                  // polarisation lost: both pass about equally
          return lensEye === picEye ? T : 0.0;
        };
        const recv = [0, 1].map((e) => ({ own: pass(e, e) * 0.5, other: pass(e, 1 - e) * 0.5 }));
        // glasses lenses: active ones blink; passive ones are tinted
        const lensOp = (e) => (s.method === 'active' ? (real ? 0.55 : e === eye ? 0.2 : 0.95) : s.method === 'colour' ? 0.4 : 0.35);
        lensL.material.opacity = lensOp(0); lensR.material.opacity = lensOp(1);
        lensL.material.color.setHex(s.method === 'colour' ? 0x7a5a2a : 0x222222); lensR.material.color.setHex(s.method === 'colour' ? 0x2a5a7a : 0x222222);
        // the screen: slowed, one eye's picture at a time; real speed, both overlapping
        const film = (t * 0.25) % 8;
        if (real) { drawScene(ctx, 512, 277, film, { eye: -1 }); ctx.globalAlpha = 0.5; drawScene(ctx, 512, 277, film, { eye: 1 }); ctx.globalAlpha = 1; }
        else { drawScene(ctx, 512, 277, film, { eye: eye ? 1 : -1 }); ctx.fillStyle = eye ? 'rgba(56,212,255,.12)' : 'rgba(255,181,71,.12)'; ctx.fillRect(0, 0, 512, 277); ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = eye ? '#38d4ff' : '#ffb547'; ctx.fillText(eye ? 'RIGHT-EYE PICTURE' : 'LEFT-EYE PICTURE', 16, 36); }
        tex.needsUpdate = true; lastEye = eye;
        // light packets along projector → screen → each eye
        const P = new THREE.Vector3(...lensP), S = new THREE.Vector3(), E = new THREE.Vector3();
        for (let i = 0; i < NP; i++) {
          const ph = ((u * (real ? 0.02 : 0.25)) + i / NP) % 1, pe = (Math.floor(u - ph * 2) % 2 + 2) % 2;
          const sx = ((i * 37) % 11) / 10 - 0.5, sy = ((i * 53) % 7) / 6 - 0.5;
          S.set(sx * SW * 0.7, SY + sy * SH * 0.6, 0.05);
          const tgt = i % 2 ? 1 : 0;                   // which eye this packet heads for after the screen
          E.set(tgt ? 0.055 : -0.055, H + 0.02, eyeZ);
          let pos, vis = 1;
          if (ph < 0.6) pos = P.clone().lerp(S, ph / 0.6);
          else { const k = (ph - 0.6) / 0.4; pos = S.clone().lerp(E, k); if (k > 0.92) vis = pass(tgt, pe) > 0.01 ? 1 : 0; }
          o.position.copy(pos); o.scale.setScalar(vis ? 1 : 0.001); o.updateMatrix(); packets.setMatrixAt(i, o.matrix);
          packets.setColorAt(i, col.setHex(pe ? RCOL : LCOL));
        }
        packets.instanceMatrix.needsUpdate = true; packets.instanceColor.needsUpdate = true;
        cur.s = s; cur.recv = recv; cur.film = film;
        const k = `${s.method}|${s.glasses}|${s.silver}|${Math.floor(t * 4)}`;
        if (k !== lastK) { lastK = k; eyes.redraw(); }
        void time;
      },
      readout(s) {
        const share = eyeShare(s.method), scr = s.method === 'polar' && !s.silver;
        return `<div class="big">${s.glasses ? `About ${Math.round(share * 100)}% of the light per eye` : 'Glasses off: a double picture'}</div>
          <div class="row"><span>Flashes</span><b>24 frames × 2 eyes × 3 = 144 a second</b></div>
          <div class="row"><span>Each eye sees its picture</span><b>half the time</b></div>
          <div class="row"><span>If 2D is 14 fL, 3D is about</span><b>${(DCI_FL * share).toFixed(1)} fL (rough estimate)</b></div>
          <div class="row"><span>Screen</span><b>${s.silver ? 'silver, keeps polarisation' : 'matte white'}</b></div>
          ${scr ? '<div class="no">Matte white scrambles polarisation: both eyes see both pictures.</div>' : ''}`;
      },
    };
  },
};
