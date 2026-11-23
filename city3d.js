// =====================================================
//  여의도 3D 야경 (three.js로 실제 입체 모델을 만들어 한 번 렌더링)
//  - 한강 북쪽 강변 높은 곳에서 여의도를 비스듬히 내려다보는 카메라
//  - 건물마다 창문 텍스처를 만들어 붙이고, 창은 스스로 빛나게(emissive)
//  - 결과 이미지를 p5 배경 레이어에 그려 넣음
// =====================================================

// 창문 텍스처: 층마다 켜진 정도가 다른 사무실 / 세대별 불빛의 아파트 / 금빛 유리
function makeWinTex(widthM, heightM, style) {
  let cols = Math.max(2, Math.round(widthM / (style === "apt" ? 4.5 : 3.2)));
  let rows = Math.max(3, Math.round(heightM / 3.8));
  let cw = 12, rh = 14;
  let c = document.createElement("canvas");
  c.width = Math.min(1024, cols * cw);
  c.height = Math.min(2048, rows * rh);
  cw = c.width / cols;
  rh = c.height / rows;
  let g = c.getContext("2d");
  let base = { office: "#0a0d15", apt: "#3a362f", gold: "#2a1d08", assembly: "#6e5f48" }[style];
  g.fillStyle = base;
  g.fillRect(0, 0, c.width, c.height);
  const tones = {
    office: ["255,236,200", "235,245,255", "255,214,150", "210,225,255"],
    apt: ["255,205,140", "255,225,170", "255,190,120"],
    gold: ["255,205,110", "255,220,140", "255,190,90"],
    assembly: ["255,225,170", "255,235,190"]
  }[style];
  for (let r = 0; r < rows; r++) {
    let q = Math.random();
    let p = style === "gold" ? 0.75 : style === "assembly" ? 0.85 : style === "apt" ? 0.5 :
            (q < 0.08 ? 0.9 : q < 0.45 ? 0.05 : 0.15 + Math.random() * 0.3);
    let tone = tones[Math.floor(Math.random() * tones.length)];
    let cc = 0;
    while (cc < cols) {
      let run = 1 + Math.floor(Math.random() * 4);
      let lit = Math.random() < p;
      for (let k = 0; k < run && cc < cols; k++, cc++) {
        let a = lit ? 0.75 + Math.random() * 0.25 : 0.05;
        g.fillStyle = lit ? `rgba(${tone},${a})` : "rgba(120,140,170,0.07)";
        g.fillRect(cc * cw + 1, r * rh + 2, cw - 2, rh - 4);
      }
    }
    if (style === "apt") {                         // 발코니 띠
      g.fillStyle = "rgba(200,190,170,0.35)";
      g.fillRect(0, r * rh + rh - 2, c.width, 1.5);
    }
  }
  let t = new THREE.CanvasTexture(c);
  t.anisotropy = 16;                               // 비스듬히 보이는 옆면 창문도 또렷하게
  return t;
}

function boxBuilding(scene, x, z, w, d, h, style, opts = {}) {
  let col = { office: 0x1a2130, apt: 0x8a8070, gold: 0xb58a3a, assembly: 0xd8ccb4 }[style];
  let front = makeWinTex(w, h, style), side = makeWinTex(d, h, style);
  let mk = (tex) => new THREE.MeshStandardMaterial({
    color: col, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: style === "assembly" ? 0.7 : 1.0,
    roughness: style === "office" || style === "gold" ? 0.25 : 0.8,
    metalness: style === "office" ? 0.6 : style === "gold" ? 0.8 : 0.1
  });
  let roof = new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: 0.9 });
  let mats = [mk(side), mk(side), roof, roof, mk(front), mk(front)];
  let geo = new THREE.BoxGeometry(w, h, d);
  if (opts.slope) {                                // 비스듬히 잘린 지붕 (IFC, FKI)
    let pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) pos.setY(i, h / 2 - ((pos.getX(i) / w) + 0.5) * opts.slope);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  let m = new THREE.Mesh(geo, mats);
  m.position.set(x, h / 2, z);
  if (opts.rotY) m.rotation.y = opts.rotY;
  scene.add(m);
  return m;
}

function antenna(scene, x, z, y, len) {
  let m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, len, 6),
                         new THREE.MeshStandardMaterial({ color: 0x777777 }));
  m.position.set(x, y + len / 2, z);
  scene.add(m);
  let red = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  red.position.set(x, y + len, z);
  scene.add(red);
}

// 파크원: 네 모서리의 붉은 거대 기둥 + 흰 지그재그 조명
function parc1(scene, x, z, w, h) {
  boxBuilding(scene, x, z, w, w, h, "office");
  let colMat = new THREE.MeshStandardMaterial({ color: 0x7a1a14, roughness: 0.6, emissive: 0x220500 });
  let lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  let cs = w * 0.14, ext = h * 0.06;
  for (let sx of [-1, 1]) for (let sz of [-1, 1]) {
    let cx = x + sx * (w / 2), cz = z + sz * (w / 2);
    let col = new THREE.Mesh(new THREE.BoxGeometry(cs, h + ext, cs), colMat);
    col.position.set(cx, (h + ext) / 2, cz);
    scene.add(col);
    let pts = [], seg = cs * 2.2;
    for (let y = 0, k = 0; y < h + ext; y += seg, k++) {
      let a = (k % 2 ? 1 : -1) * cs * 0.52;
      pts.push(new THREE.Vector3(cx - a, y, cz + sz * cs * 0.52), new THREE.Vector3(cx + a, y + seg, cz + sz * cs * 0.52));
      pts.push(new THREE.Vector3(cx + sx * cs * 0.52, y, cz - a), new THREE.Vector3(cx + sx * cs * 0.52, y + seg, cz + a));
    }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
}

// 국회의사당: 넓은 몸체 + 가는 기둥 + 얇은 지붕판 + 원통 받침 + 갈빗대 무늬 돔
function assembly3D(scene, x, z) {
  let W = 122, D = 100, H = 32;
  boxBuilding(scene, x, z, W, D, H, "assembly");
  let colMat = new THREE.MeshStandardMaterial({ color: 0xcfe6ff, emissive: 0x9fc4e8, emissiveIntensity: 0.9 });
  for (let i = 0; i < 9; i++) {                     // 정면·옆면 기둥
    let fx = x - W / 2 + 2 + (W - 4) * i / 8;
    let c = new THREE.Mesh(new THREE.BoxGeometry(2.2, H, 2.2), colMat);
    c.position.set(fx, H / 2, z + D / 2 + 1.2);
    scene.add(c);
  }
  for (let i = 0; i < 7; i++) {
    let fz = z - D / 2 + 2 + (D - 4) * i / 6;
    let c = new THREE.Mesh(new THREE.BoxGeometry(2.2, H, 2.2), colMat);
    c.position.set(x + W / 2 + 1.2, H / 2, fz);
    scene.add(c);
  }
  let slab = new THREE.Mesh(new THREE.BoxGeometry(W + 10, 2.5, D + 10),
                            new THREE.MeshStandardMaterial({ color: 0x2a2d33, emissive: 0x111317 }));
  slab.position.set(x, H + 1.2, z);
  scene.add(slab);
  // 원통 받침: 흰 벽 + 세로 홈
  let dc = document.createElement("canvas"); dc.width = 512; dc.height = 64;
  let dg = dc.getContext("2d");
  dg.fillStyle = "#eef3f6"; dg.fillRect(0, 0, 512, 64);
  dg.fillStyle = "#3a4250";
  for (let i = 0; i < 48; i++) dg.fillRect(i * 512 / 48 + 3, 22, 4, 32);
  let dt = new THREE.CanvasTexture(dc);
  let drum = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({ map: dt, emissive: 0xffffff, emissiveMap: dt, emissiveIntensity: 0.85 }));
  drum.position.set(x, H + 2.5 + 5, z);
  scene.add(drum);
  // 돔: 넓적한 반구, 연한 청록 조명 + 갈빗대
  let domeGeo = new THREE.SphereGeometry(31, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  let dome = new THREE.Mesh(domeGeo, new THREE.MeshStandardMaterial({
    color: 0x8fd6cc, emissive: 0x3f8a82, emissiveIntensity: 0.9, roughness: 0.5, metalness: 0.2 }));
  dome.scale.y = 0.62;
  dome.position.set(x, H + 12.5, z);
  scene.add(dome);
  let ribs = new THREE.Mesh(new THREE.SphereGeometry(31.2, 24, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x2f6a66, wireframe: true, transparent: true, opacity: 0.6 }));
  ribs.scale.y = 0.62;
  ribs.position.copy(dome.position);
  scene.add(ribs);
}

function renderCity3D(w, h, groundY, pd = 1) {
  let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(pd);
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);

  let scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x6a4a6e, 2600, 7500);  // 먼 곳은 노을빛 밤안개에 흐려짐

  let cam = new THREE.PerspectiveCamera(22, w / h, 10, 8000);
  cam.position.set(-200, 200, 1750);                 // 강 건너 북쪽, 살짝 높은 곳에서 비스듬히
  cam.lookAt(0, 140, -100);

  scene.add(new THREE.HemisphereLight(0x8a6a9a, 0x2a1a10, 0.35));   // 노을 하늘빛
  let moon = new THREE.DirectionalLight(0xc8d4ff, 0.35);  // 오른쪽 위 달빛
  moon.position.set(800, 900, 600);
  scene.add(moon);
  let city = new THREE.PointLight(0xffa060, 0.45, 1500);  // 아래에서 올라오는 도시 불빛
  city.position.set(0, 20, 400);
  scene.add(city);

  // 여의도 땅 (카메라 쪽 강가 가장자리 z = +230, 뒤로 갈수록 z가 작아짐) + 거리 불빛
  let land = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2600), new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 1 }));
  land.rotation.x = -Math.PI / 2;
  land.position.set(0, 0, 230 - 1300);
  scene.add(land);
  let lamps = [];
  for (let i = 0; i < 900; i++) lamps.push(new THREE.Vector3(-1600 + Math.random() * 3200, 1.5, 220 - Math.random() * 1800));
  scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(lamps),
            new THREE.PointsMaterial({ color: 0xffc070, size: 2.2, sizeAttenuation: false })));

  // 뒤쪽 빌딩숲·아파트 (랜드마크 자리는 비움)
  let keep = [[-560, -100], [-258, 0], [-50, -150], [10, -200], [60, -120], [195, -250], [280, -250], [410, -100]];
  for (let i = 0; i < 260; i++) {
    let x = -1000 + Math.random() * 2000, z = -260 - Math.random() * 1300;
    if (keep.some(([kx, kz]) => Math.abs(kx - x) < 90 && Math.abs(kz - z) < 110)) continue;
    if (x > 300 && x < 580 && z > -520) continue;              // 국회의사당 뒤는 비워서 잘 보이게
    let apt = Math.random() < 0.4;
    let bw = apt ? 50 + Math.random() * 40 : 30 + Math.random() * 40;
    let bd = apt ? 14 + Math.random() * 6 : 25 + Math.random() * 30;
    let bh = apt ? 35 + Math.random() * 45 : 50 + Math.random() * 110;
    let b = boxBuilding(scene, x, z, bw, bd, bh, apt ? "apt" : "office", { rotY: (Math.random() - 0.5) * 0.3 });
    if (!apt && Math.random() < 0.3) antenna(scene, x, z, bh, 8 + Math.random() * 15);
  }

  // 멀리 펼쳐진 아파트 불빛 바다 (텍스처를 재사용해 가볍게)
  let farTex = [0, 1, 2, 3, 4, 5].map(() => makeWinTex(60, 50, "apt"));
  for (let i = 0; i < 700; i++) {
    let x = -3200 + Math.random() * 6400, z = -1500 - Math.random() * 3500;
    let tex = farTex[i % farTex.length];
    let mat = new THREE.MeshStandardMaterial({ color: 0x8a8070, map: tex, emissive: 0xffffff, emissiveMap: tex, roughness: 0.9 });
    let m = new THREE.Mesh(new THREE.BoxGeometry(40 + Math.random() * 40, 25 + Math.random() * 45, 15), mat);
    m.position.set(x, m.geometry.parameters.height / 2, z);
    m.rotation.y = (Math.random() - 0.5) * 0.6;
    scene.add(m);
  }

  // 랜드마크
  boxBuilding(scene, -560, -100, 48, 36, 249, "gold");          // 63빌딩
  antenna(scene, -560, -100, 249, 40);
  boxBuilding(scene, -290, 0, 42, 30, 135, "office");          // LG 트윈타워
  boxBuilding(scene, -226, 0, 42, 30, 135, "office");
  boxBuilding(scene, -50, -150, 55, 40, 160, "office", { slope: 18 });   // One IFC
  boxBuilding(scene, 10, -200, 50, 40, 140, "office", { slope: 16 });    // Two IFC
  boxBuilding(scene, 60, -120, 46, 46, 284, "office", { slope: 26 });    // Three IFC
  parc1(scene, 280, -250, 52, 256);                                      // 파크원 2동
  parc1(scene, 195, -250, 58, 333);                                      // 파크원 1동
  boxBuilding(scene, 410, -100, 50, 50, 245, "office", { slope: -22 });  // FKI타워
  assembly3D(scene, 430, 120);                                            // 국회의사당

  renderer.render(scene, cam);

  // 여의도 강가(땅의 앞 가장자리)가 화면의 수면선(groundY)에 오도록 맞춤
  let v = new THREE.Vector3(0, 0, 230).project(cam);
  let baseY = (1 - v.y) / 2 * h;
  let out = document.createElement("canvas");
  out.width = w * pd; out.height = h * pd;
  out.getContext("2d").drawImage(renderer.domElement, 0, (groundY - baseY) * pd);
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
