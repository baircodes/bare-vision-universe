/* main3d.js — Bare Vision v2: refined materials, atmosphere, gems + chrome orbs
   Dependencies: Three.js (r128+) and SimplexNoise
*/
(() => {
  // mobile detection = skip heavy scene for performance optimization
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent)
    || (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);

  if (isMobile) {
    // hide loader if present so the site is accessible
    document.getElementById('page-loader')?.classList.add('hidden');
    console.log('Mobile: skipping heavy 3D scene.');
    return;
  }

  // scene setup
  const container = document.getElementById('three-container');
  if (!container) return; // Guard clause if container is missing

  const scene = new THREE.Scene();
  const clock = new THREE.Clock();

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 3000);
  camera.position.set(0, 16, 48);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // fog for atmospheric depth - warm ivory
  scene.fog = new THREE.FogExp2(0xf7efe8, 0.00065);

  // hemisphere + directional (sun) lighting
  const hemi = new THREE.HemisphereLight(0xfff4ea, 0x303040, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe7c6, 1.0);
  sun.position.set(40, 80, -40);
  scene.add(sun);

  // soft ambient fill
  const amb = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(amb);

  // Simplex noise for dunes - Ensure SimplexNoise lib is loaded in HTML
  // Fallback if SimplexNoise is not defined to prevent crash
  const simplex = (typeof SimplexNoise !== 'undefined') 
    ? new SimplexNoise(Math.random) 
    : { noise3D: () => 0 }; 

  // Build a higher-res plane for dunes but smoother shading
  const planeSize = 900;
  const segX = 260;
  const segY = 140;
  const geom = new THREE.PlaneGeometry(planeSize, planeSize, segX, segY);
  geom.rotateX(-Math.PI / 2);

  // store base Y for reference
  const posAttr = geom.attributes.position;
  const vCount = posAttr.count;
  const baseY = new Float32Array(vCount);
  for (let i = 0; i < vCount; i++) baseY[i] = posAttr.getY(i);

  // dune material: slightly specular, warm sand
  const duneMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbcdbf,
    roughness: 0.92,
    metalness: 0.02,
    clearcoat: 0.08,
    sheen: 0.18,
    sheenColor: 0xefdcc9
  });

  const dunes = new THREE.Mesh(geom, duneMat);
  dunes.receiveShadow = false;
  dunes.position.y = -6;
  scene.add(dunes);

  // soft volumetric cone (cheap god-ray)
  const coneGeo = new THREE.ConeGeometry(120, 260, 32, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff0d4,
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(0, 80, -120);
  cone.rotateX(Math.PI);
  scene.add(cone);

  // create groups for orbs
  const orbGroup = new THREE.Group();
  scene.add(orbGroup);

  // Orbs: create chrome-metal and gemstone (orchid) spheres
  function createOrb({ radius = 2.6, pos = [0, 14, -50], metal = true, tint = 0xffffff }) {
    const geom = new THREE.SphereGeometry(radius, 48, 32);

    let mat;
    if (metal) {
      mat = new THREE.MeshPhysicalMaterial({
        color: tint,
        metalness: 1.0,
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
      });
    } else {
      // gem-like: use transmission. Approximating translucent gem
      mat = new THREE.MeshPhysicalMaterial({
        color: tint,
        metalness: 0.0,
        roughness: 0.12,
        transmission: 0.9,
        thickness: 1.8,
        ior: 1.4,
        specularIntensity: 0.7,
        opacity: 0.98,
        transparent: true,
      });
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(...pos);
    mesh.userData = {
      drift: 0.01 + Math.random() * 0.028,
      radius,
      metal,
      baseX: mesh.position.x,
      baseZ: mesh.position.z,
      wobble: Math.random() * 0.8 + 0.6
    };

    return mesh;
  }

  // spawn orbs: fewer gems, more chrome
  const totalOrbs = 12;
  for (let i = 0; i < totalOrbs; i++) {
    const x = (Math.random() - 0.5) * 320;
    const z = -20 - Math.random() * 420;
    const y = 8 + Math.random() * 36;
    const isMetal = Math.random() > 0.35;
    const tint = isMetal ? 0xffffff : 0xD3A8D9; // orchid-ish
    const orb = createOrb({ radius: 1.6 + Math.random() * 3.2, pos: [x, y, z], metal: isMetal, tint });
    orbGroup.add(orb);
  }

  // dust sprite layer for shimmer
  const dustCount = 420;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3 + 0] = (Math.random() - 0.5) * 900;
    dustPos[i * 3 + 1] = Math.random() * 60 + 2;
    dustPos[i * 3 + 2] = -Math.random() * 600;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xfff6ef, size: 0.9, transparent: true, opacity: 0.14 });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // day parameter: 0 = sunrise, 0.5 = midday, 1 = sunset->night
  let dayT = 0.05;

  // pointer parallax
  const pointer = { x: 0, y: 0 };
  window.addEventListener('mousemove', e => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  });

  // resize
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }, { passive: true });

  // simple scroll -> dayT mapping
  window.addEventListener('scroll', () => {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const sc = docH > 0 ? window.scrollY / docH : 0;
    dayT = Math.min(1, Math.max(0, sc));
  }, { passive: true });

  // animation loop (tuned)
  const posBuffer = dust.geometry.attributes.position.array;
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    t += delta * 0.6;

    // dunes: vertex displacement with layered noise
    for (let i = 0; i < vCount; i++) {
      const ix = posAttr.getX(i);
      const iz = posAttr.getZ(i);
      const n1 = simplex.noise3D(ix * 0.004 + t * 0.08, iz * 0.004 + t * 0.06, t * 0.02);
      const n2 = simplex.noise3D(ix * 0.02 + t * 0.03, iz * 0.02 + t * 0.02, t * 0.01) * 0.8;
      // sculpt amplitude
      const height = n1 * 3.6 + n2 * 1.6;
      posAttr.setY(i, baseY[i] + height);
    }
    posAttr.needsUpdate = true;
    geom.computeVertexNormals();

    // orbs: subtle float + drift
    orbGroup.children.forEach((o, idx) => {
      const ud = o.userData;
      // horizontal orbital wobble
      o.position.x = ud.baseX + Math.sin(t * ud.wobble + idx) * (0.5 + idx % 3 * 0.4);
      o.position.z += Math.sin(t * 0.12 + idx) * 0.02; // slight z wobble
      // drift down slowly
      o.position.y -= ud.drift * 0.4;
      // wrap upward if below dunes
      if (o.position.y < -8) {
        o.position.y = 18 + Math.random() * 36;
        ud.baseX = (Math.random() - 0.5) * 320;
        o.position.x = ud.baseX;
      }
      o.rotation.y += 0.002 + (idx % 4) * 0.0012;
      o.rotation.x += 0.0018;
    });

    // dust gentle rising/wind
    for (let i = 0; i < dustCount; i++) {
      let idx = i * 3;
      posBuffer[idx + 1] += Math.sin(t * 0.2 + i) * 0.0008 - 0.0006;
      if (posBuffer[idx + 1] < 0.5) posBuffer[idx + 1] = 62 + Math.random() * 8;
    }
    dust.geometry.attributes.position.needsUpdate = true;

    // camera soft parallax
    const targetX = pointer.x * 4;
    const targetY = 14 + -pointer.y * 6;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -120);

    // day-night lighting interpolation
    const dawn = new THREE.Color(0xffd8b8);
    const noon = new THREE.Color(0xfffbff);
    const dusk = new THREE.Color(0xffb28c);
    let col = new THREE.Color();
    if (dayT < 0.5) col.copy(dawn).lerp(noon, dayT * 2);
    else col.copy(noon).lerp(dusk, (dayT - 0.5) * 2);
    sun.color.copy(col);
    sun.intensity = 0.8 + (1 - Math.abs(0.5 - dayT)) * 1.0;
    
    // adjust fog and scene bg
    const bgStart = new THREE.Color(0xfaf6f0);
    const bgMid = new THREE.Color(0xeef7ff);
    const bgEnd = new THREE.Color(0x061022);
    const mixBg = bgStart.clone().lerp(bgMid, Math.min(1, dayT * 1.2)).lerp(bgEnd, Math.max(0, (dayT - 0.7)));
    scene.background = mixBg;

    // subtle tint for dune material
    duneMat.color.lerp(new THREE.Color(0xdbcdbf).lerp(new THREE.Color(0xe9d6c0), dayT * 0.6), 0.04);

    renderer.render(scene, camera);
  }

  animate();

  // remove loader after small delay
  setTimeout(() => document.getElementById('page-loader')?.classList.add('hidden'), 900);
})();
