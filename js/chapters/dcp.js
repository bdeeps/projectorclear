// Chapter 5: the Digital Cinema Package. The film arrives as files (JPEG 2000 pictures, PCM sound,
// encrypted), is ingested into the cinema's server, and only plays inside the time window of its key (KDM).
//  - DCP picture: JPEG 2000 frames in MXF files, maximum 250 Mbit/s (about 1.3 MB a frame at 24 fps);
//    2K 2048×1080, 4K 4096×2160 (DCI specification; Wikipedia "Digital Cinema Package").
//  - Content is encrypted (AES-128). The Key Delivery Message (KDM) is an XML file holding those keys,
//    encrypted for one server's certificate, and valid only between two dates/times (Wikipedia "Digital
//    Cinema Package"; DCI specification).
//  - Typical size: a 2-hour 2K feature is roughly 150–250 GB; big 4K/3D packages can pass 500 GB
//    (DCPready "What is a DCP"; MASV). Size = bit rate × running time ÷ 8.
//  - Delivery: hard drive in a rugged case (commonly CRU drives), satellite, or high-speed internet.
//    In India, UFO Moviez (from 2005) and Qube Cinema deliver films to cinemas by satellite.
import { THREE, M, box, clamp, sphere } from '../kit.js';
import { board, panelBg, title, text, wrap, COL, drawScene, fitNarrow, reelBoards, lightCone, makeDigitalProjector, pressSeg } from '../projector.js';

const KDM_FROM = 0, KDM_TO = 7;                    // valid from opening day 00:00 for 7 days (an example window)
export const sizeGB = (mbps, min) => (mbps * 1e6 * min * 60) / 8 / 1e9;
const ROUTES = {
  drive: { name: 'Hard drive', what: 'A rugged hard drive arrives by courier and is copied into the cinema’s server.' },
  sat: { name: 'Satellite', what: 'A dish on the roof downloads the film overnight. In India, UFO Moviez and Qube send films to thousands of screens this way.' },
  net: { name: 'Internet', what: 'A fast fibre line downloads the package, like a very large file.' },
};
const dayLabel = (d) => { const n = Math.floor(d), h = Math.round((d - n) * 24); return `${n < 0 ? `${-n} day${n < -1 ? 's' : ''} before` : n === 0 ? 'opening day' : `day ${n + 1}`}, ${String(h % 24).padStart(2, '0')}:00`; };

// One level of a Haar wavelet on greyscale pixels: the idea at the heart of JPEG 2000.
function haar(src, w, h) {
  const out = new Float32Array(w * h), tmp = new Float32Array(w * h), hw = w / 2, hh = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < hw; x++) { const a = src[y * w + 2 * x], b = src[y * w + 2 * x + 1]; tmp[y * w + x] = (a + b) / 2; tmp[y * w + hw + x] = (a - b) / 2; }
  for (let x = 0; x < w; x++) for (let y = 0; y < hh; y++) { const a = tmp[2 * y * w + x], b = tmp[(2 * y + 1) * w + x]; out[y * w + x] = (a + b) / 2; out[(hh + y) * w + x] = (a - b) / 2; }
  return out;
}

export default {
  id: 'dcp',
  short: 'The DCP',
  title: 'A film in a box of files, locked with a key',
  subtitle: 'Films arrive as a Digital Cinema Package, and they only play when the key says so.',
  view: { pos: [2.2, 4.9, 9.2], target: [1.0, 2.0, 0] },
  learn: `<p>A digital film reaches the cinema as a <b>DCP</b>, a Digital Cinema Package: a folder of files. Every frame of picture is a separate <b>JPEG 2000</b> image, squeezed with <b>wavelets</b> that split the picture into a small rough version plus fine details. There are up to 250 megabits for every second of film. The sound travels as uncompressed audio beside it (FilmSoundClear follows it to the speakers). A two-hour feature comes to roughly <b>150 to 250 GB</b>.</p>
    <p>It arrives on a rugged <b>hard drive</b>, over a fast <b>internet</b> line, or by <b>satellite</b>. India was early here: from 2005, <b>UFO Moviez</b> and <b>Qube Cinema</b> began sending films to cinemas, many in small towns, by satellite instead of shipping heavy film cans.</p>
    <p>The files are <b>encrypted</b>. To play them, the cinema needs a <b>KDM</b> (Key Delivery Message): a small file holding the keys, made for <b>this one server</b>, and valid only between two dates. Before release day the film sits locked on the server. At showtime the server checks the key, unlocks the pictures, decodes them and sends them to the <b>projector</b>, which adds an invisible watermark to trace any camera piracy.</p>
    <p class="tip"><b>Try it:</b> change the running time and bit rate and watch the size. Slide the clock to before opening day: the key is not valid yet, so the screen stays locked.</p>`,
  terms: [
    { t: 'DCP', d: 'Digital Cinema Package: the standard set of files for a film, with pictures, sound, subtitles and a playlist.' },
    { t: 'JPEG 2000', d: 'The image format used for every cinema frame. It compresses with wavelets and has no blocky artefacts.' },
    { t: 'Wavelet', d: 'A way to split a picture into a half-size rough copy plus the details needed to rebuild it.' },
    { t: 'KDM', d: 'Key Delivery Message: the key file that unlocks one film on one server, for a set time window.' },
    { t: 'Ingest', d: 'Copying the DCP into the cinema’s server before the show.' },
    { t: 'Forensic watermark', d: 'An invisible pattern added at playback that can reveal which cinema and time a pirated copy came from.' },
  ],
  defaults: { route: 'sat', res: '2K', minutes: 150, mbps: 200, day: 2.8 },
  controls: [
    { key: 'route', type: 'seg', label: 'How the film arrives (or tap a part)', options: Object.entries(ROUTES).map(([v, m]) => ({ v, label: m.name })) },
    { key: 'minutes', type: 'range', label: 'Running time', min: 80, max: 210, step: 1, ends: ['80 min', '3½ hours'], fmt: (v) => `${Math.round(v)} min` },
    { key: 'mbps', type: 'range', label: 'Picture bit rate', min: 80, max: 250, step: 1, ends: ['80 Mbit/s', '250 (DCI max)'], fmt: (v, s) => `${Math.round(v)} Mbit/s · ${sizeGB(v, s.minutes).toFixed(0)} GB` },
    { key: 'res', type: 'seg', label: 'Resolution', options: [{ v: '2K', label: '2K 2048×1080' }, { v: '4K', label: '4K 4096×2160' }] },
    { key: 'day', type: 'range', label: 'Clock', min: -3, max: 9, step: 0.05, ends: ['3 days before release', 'day 10'], fmt: (v) => dayLabel(v) },
  ],
  quiz: [
    { q: 'What is a KDM?', options: ['A type of lens', 'A key file that unlocks a film on one particular server, only between set dates', 'The hard drive the film comes on', 'The projector’s bulb'], answer: 1, why: 'The DCP is encrypted. The KDM carries its keys, locked to one server’s certificate and a time window.' },
    { q: 'A film is 120 minutes at 200 Mbit/s. Roughly how big is the picture data?', options: ['18 MB', '1.8 GB', '180 GB', '18 TB'], answer: 2, why: '200 Mbit/s × 7,200 s = 1,440,000 Mbit = 180,000 MB, about 180 GB.' },
    { q: 'How does JPEG 2000 start compressing a frame?', options: ['It deletes every other frame', 'It uses wavelets to split the picture into a small rough copy plus layers of fine detail', 'It turns it black and white', 'It cuts it into 8×8 blocks'], answer: 1, why: 'Wavelets keep a half-size average and separate details. Most detail values are near zero and pack down small.' },
  ],
  reel: [
    { ms: 5400, caption: 'A digital film arrives as encrypted files, and only unlocks when its key says it is showtime.', set: { route: 'sat', res: '2K', minutes: 150, mbps: 200 }, anim: { day: [-1.5, 1.2] }, view: { pos: [2.2, 4.9, 9.2], target: [1.0, 2.0, 0] }, spin: 0.35 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // the booth
    const floor = box(7, 0.15, 4, M.matte(0x22252c)); floor.position.set(0, -0.075, 0); root.add(floor);
    const back = box(7, 3, 0.1, M.ghost(0x8ea0c0, 0.14)); back.position.set(0, 1.5, -2); root.add(back);
    const roof = box(7, 0.1, 4, M.ghost(0x8ea0c0, 0.08)); roof.position.set(0, 3.05, 0); root.add(roof);
    const front = box(0.1, 3, 4, M.ghost(0x8ea0c0, 0.14)); front.position.set(3.5, 1.5, 0); root.add(front);
    const port = box(0.12, 0.5, 0.9, M.glow(0x8ec5ff, { transparent: true, opacity: 0.6 })); port.position.set(3.5, 1.4, 0.2); root.add(port);
    const parts = {};
    const tag = (id, g) => { g.traverse((q) => { q.userData.part = id; }); parts[id] = g; return g; };
    // server rack with drive bays and LEDs
    const rack = tag('server', new THREE.Group()); rack.position.set(-1.6, 0, -1.0); root.add(rack);
    rack.add(Object.assign(box(0.7, 1.8, 0.8, M.matte(0x2a2e36)), {}));
    rack.children[0].position.y = 0.9;
    const leds = [];
    for (let i = 0; i < 6; i++) { const b = box(0.55, 0.12, 0.02, M.matte(0x3a3f4b)); b.position.set(0, 0.35 + i * 0.22, 0.41); rack.add(b); const l = sphere(0.02, M.glow(0x5ce1a9)); l.position.set(0.22, 0.35 + i * 0.22, 0.43); rack.add(l); leds.push(l); }
    // the drive in its case, on a table
    const drive = tag('drive', new THREE.Group()); drive.position.set(-2.8, 0, 0.6); root.add(drive);
    const table = box(0.9, 0.8, 0.6, M.matte(0x3a2f28)); table.position.y = 0.4; drive.add(table);
    const caseB = box(0.5, 0.2, 0.36, M.plastic(0xd4a017)); caseB.position.y = 0.9; drive.add(caseB);
    const hdd = box(0.18, 0.05, 0.26, M.metal(0x9aa0aa)); hdd.position.set(0, 1.03, 0); drive.add(hdd);
    // satellite dish on the roof
    const sat = tag('sat', new THREE.Group()); sat.position.set(1.0, 3.1, -1.2); root.add(sat);
    const dishG = new THREE.SphereGeometry(0.7, 32, 12, 0, Math.PI * 2, 0, 0.6); const dish = new THREE.Mesh(dishG, M.metal(0xdfe3ea, { side: THREE.DoubleSide, metalness: 0.4 }));
    dish.rotation.x = -Math.PI / 2 - 0.7; dish.position.y = 0.8; sat.add(dish);
    const mast = box(0.08, 0.8, 0.08, M.metal(0x777777)); mast.position.y = 0.4; sat.add(mast);
    const lnb = sphere(0.06, M.matte(0x222222)); lnb.position.set(0, 1.25, 0.45); sat.add(lnb);
    // internet line
    const net = tag('net', new THREE.Group()); net.position.set(-3.45, 0, -1.0); root.add(net);
    const socket = box(0.1, 0.3, 0.3, M.plastic(0x5b8cff)); socket.position.y = 1.2; net.add(socket);
    // projector with its media block
    const proj = tag('proj', makeDigitalProjector({})); proj.position.set(2.2, 0.8, 0.2); proj.rotation.y = -Math.PI / 2; root.add(proj);
    const stand = box(0.9, 0.8, 1.0, M.matte(0x2a2e36)); stand.position.set(2.2, 0.2, 0.2); root.add(stand);
    const out = lightCone(0xf4f8ff, 0.1); root.add(out);
    // the KDM key and a padlock between server and projector
    const key = new THREE.Group(); key.position.set(0.4, 2.3, -0.2); root.add(key);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 24), M.metal(0xffd166)); key.add(bow);
    const blade = box(0.35, 0.05, 0.03, M.metal(0xffd166)); blade.position.x = 0.28; key.add(blade);
    for (const x of [0.36, 0.43]) { const t = box(0.03, 0.08, 0.03, M.metal(0xffd166)); t.position.set(x, -0.05, 0); key.add(t); }
    const lock = new THREE.Group(); lock.position.set(1.2, 1.35, 0.2); root.add(lock);
    const lockBody = box(0.26, 0.22, 0.12, M.metal(0xc9ced6)); lock.add(lockBody);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 20, Math.PI), M.metal(0xc9ced6)); shackle.position.y = 0.11; lock.add(shackle);
    // mini screen seen through the port
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 173; const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.19), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide })); scr.position.set(5.4, 1.9, 0.2); scr.rotation.y = -Math.PI / 2; root.add(scr);
    out.set([2.2 + 0.63, 1.15, 0.2 - 0.1], [[5.38, 1.3, 1.3], [5.38, 1.3, -0.9], [5.38, 2.5, -0.9], [5.38, 2.5, 1.3]]);
    // data packets along the chosen route
    const ENTRY = { drive: [[-2.8, 1.0, 0.6], [-2.1, 1.1, -0.2]], sat: [[1.0, 3.6, -1.0], [-0.6, 2.6, -0.9]], net: [[-3.4, 1.2, -1.0], [-2.4, 1.3, -1.0]] };
    const NP = 26, packets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), M.glow(0x8ef0ff), NP); packets.frustumCulled = false; root.add(packets);
    const o = new THREE.Object3D();

    // JPEG 2000 wavelet board: a frame, and two levels of Haar wavelets
    const W = 256, Hh = 128;
    const src = document.createElement('canvas'); src.width = W; src.height = Hh; drawScene(src.getContext('2d'), W, Hh, 1.3);
    const px = src.getContext('2d').getImageData(0, 0, W, Hh).data, grey = new Float32Array(W * Hh);
    for (let i = 0; i < W * Hh; i++) grey[i] = 0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2];
    let c1 = haar(grey, W, Hh);
    const ll = new Float32Array((W / 2) * (Hh / 2)); for (let y = 0; y < Hh / 2; y++) for (let x = 0; x < W / 2; x++) ll[y * (W / 2) + x] = c1[y * W + x];
    const c2 = haar(ll, W / 2, Hh / 2);
    for (let y = 0; y < Hh / 2; y++) for (let x = 0; x < W / 2; x++) c1[y * W + x] = c2[y * (W / 2) + x];
    const wav = document.createElement('canvas'); wav.width = W; wav.height = Hh; const wg = wav.getContext('2d'), wd = wg.createImageData(W, Hh);
    let small = 0;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, isLL = x < W / 4 && y < Hh / 4, v = c1[i];
      const g = isLL ? v : 128 + v * 4; if (!isLL && Math.abs(v) < 2) small++;
      wd.data[i * 4] = wd.data[i * 4 + 1] = wd.data[i * 4 + 2] = clamp(g, 0, 255); wd.data[i * 4 + 3] = 255;
    }
    wg.putImageData(wd, 0, 0);
    const detailShare = small / (W * Hh * (1 - 1 / 16));
    const cur = {};
    const bd = board(root, 4.2, 2.9, 800, 552, (g, w, h) => {
      panelBg(g, w, h);
      const s = cur.s; if (!s) return;
      const gb = sizeGB(s.mbps, s.minutes), frames = Math.round(s.minutes * 60 * 24), mb = (s.mbps / 24 / 8);
      title(g, `${gb.toFixed(0)} GB of pictures, ${frames.toLocaleString('en-US')} frames`, `${Math.round(s.mbps)} Mbit/s × ${Math.round(s.minutes)} min · about ${mb.toFixed(2)} MB per frame · ${s.res === '4K' ? '4096 × 2160' : '2048 × 1080'}`);
      g.drawImage(src, 24, 96, 360, 180); g.drawImage(wav, 416, 96, 360, 180);
      text(g, 'one frame', 24, 300, { font: 'bold 17px sans-serif', col: COL.text });
      text(g, 'after two wavelet steps', 416, 300, { font: 'bold 17px sans-serif', col: COL.text });
      g.strokeStyle = COL.hot; g.lineWidth = 2; g.strokeRect(416, 96, 90, 45);
      wrap(g, `Top left: a tiny rough copy. The grey areas are details, and ${Math.round(detailShare * 100)}% of them are almost zero, so they pack down very small.`, 416, 326, 360, 22, { font: '16px sans-serif', col: COL.soft });
      const r = ROUTES[s.route];
      wrap(g, `${r.name}: ${r.what}`, 24, 326, 370, 22, { font: '16px sans-serif', col: COL.soft });
      const net1 = (gb * 8) / 1 / 3600;   // hours at 1 Gbit/s
      text(g, `Over a 1 Gbit/s line: about ${net1.toFixed(1)} hours to download`, 24, 470, { font: '17px sans-serif', col: COL.text });
      const ok = s.day >= KDM_FROM && s.day < KDM_TO;
      text(g, ok ? `Key valid: plays (${dayLabel(s.day)})` : `Key not valid at ${dayLabel(s.day)}: locked`, 24, 510, { font: 'bold 19px sans-serif', col: ok ? COL.green : COL.bad });
    }, [4.1, 4.4, -1.7]); bd.mesh.rotation.y = -0.3; bd.mesh.scale.setScalar(0.9);

    const L = {
      server: stage.label('Server: stores and decrypts', [-1.6, 2.05, -0.6], root, 'hot'), drive: stage.label('Drive', [-2.8, 1.35, 0.6], root), sat: stage.label('Satellite dish', [2.0, 3.9, -1.2], root), net: stage.label('Internet line', [-3.4, 1.6, -1.0], root),
      key: stage.label('KDM key', [0.55, 2.6, -0.2], root), proj: stage.label('Projector + watermark', [2.2, 1.75, 0.2], root), scr: stage.label('Screen', [5.4, 2.7, 0.2], root),
    };
    let t = 0, lastK = '';
    stage.pickables = Object.values(parts);
    return {
      pick(obj) { const id = obj.userData.part; if (id === 'drive' || id === 'sat' || id === 'net') pressSeg(id); },
      update(dt, s, time) {
        dt = Math.max(0, dt); t += dt;
        fitNarrow(stage, [L.net, L.drive, L.scr], -0.08);
        reelBoards([[bd, [0.6, 5.8, 0.5], 1.1]]);
        const ok = s.day >= KDM_FROM && s.day < KDM_TO;
        // packets: route → server → (if unlocked) projector
        const [a, b] = ENTRY[s.route], srv = [-1.6, 1.3, -0.55], prj = [1.9, 1.15, 0.2];
        const pts = [a, b, srv, [0.3, 1.4, 0], prj].map((p) => new THREE.Vector3(...p));
        const curve = new THREE.CatmullRomCurve3(pts);
        for (let i = 0; i < NP; i++) {
          let k = ((t * 0.12) + i / NP) % 1;
          if (!ok && k > 0.5) k = 0.5 - ((k - 0.5) * 0.02);      // stuck at the server: locked
          o.position.copy(curve.getPoint(k)); o.rotation.set(t + i, t * 0.7, 0); o.updateMatrix(); packets.setMatrixAt(i, o.matrix);
        }
        packets.instanceMatrix.needsUpdate = true;
        packets.material.color.setHex(ok ? 0x8ef0ff : 0xff5a8a);
        leds.forEach((l, i) => { l.material.color.setHex((Math.floor(t * 6) + i) % 3 ? 0x5ce1a9 : 0x1c4032); });
        shackle.position.y = ok ? 0.2 : 0.11; shackle.rotation.y = ok ? 0.9 : 0;
        lockBody.material.color.setHex(ok ? 0x7be08c : 0xff5a8a);
        key.position.x = ok ? 1.0 : 0.3; key.position.y = ok ? 1.55 : 2.3; key.rotation.z = Math.sin(t * 2) * 0.1;
        out.material.opacity = ok ? 0.1 : 0.0;
        dish.visible = mast.visible = lnb.visible = true;
        L.sat.element.classList.toggle('hot', s.route === 'sat'); L.drive.element.classList.toggle('hot', s.route === 'drive'); L.net.element.classList.toggle('hot', s.route === 'net');
        if (ok) drawScene(ctx, 320, 173, t * 0.5);
        else { ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, 320, 173); ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#ff5a8a'; ctx.textAlign = 'center'; ctx.fillText('LOCKED', 160, 80); ctx.font = '16px sans-serif'; ctx.fillStyle = '#a8aebf'; ctx.fillText('no valid KDM for this time', 160, 108); ctx.textAlign = 'left'; }
        tex.needsUpdate = true;
        cur.s = s;
        const kk = `${s.route}|${Math.round(s.minutes)}|${Math.round(s.mbps)}|${s.res}|${ok}|${Math.round(s.day * 24)}`;
        if (kk !== lastK) { lastK = kk; bd.redraw(); }
        void time;
      },
      readout(s) {
        const gb = sizeGB(s.mbps, s.minutes), ok = s.day >= KDM_FROM && s.day < KDM_TO;
        return `<div class="big">${gb.toFixed(0)} GB of pictures</div>
          <div class="row"><span>Frames (24 fps)</span><b>${Math.round(s.minutes * 1440).toLocaleString('en-US')} JPEG 2000 images</b></div>
          <div class="row"><span>Each frame</span><b>about ${(s.mbps / 24 / 8).toFixed(2)} MB</b></div>
          <div class="row"><span>Arrives by</span><b>${ROUTES[s.route].name.toLowerCase()}</b></div>
          <div class="row"><span>Clock</span><b>${dayLabel(s.day)}</b></div>
          <div class="${ok ? 'ok' : 'no'}">${ok ? 'KDM valid: the server unlocks the film.' : 'Outside the KDM window: the film stays locked.'}</div>`;
      },
    };
  },
};
