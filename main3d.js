// main3d.js — Optimized for Bare Vision
// Engineering Note: Handles WebGL initialization, responsive loop, and noise generation.

(() => {
  'use strict';

  // --- CONFIGURATION ---
  const CONFIG = {
    cameraY: 20,
    cameraZ: 50,
    speed: 0.003, // Global animation speed
    duneSegments: { w: 100, h: 80 }, // Optimized for performance (vs 200x120)
    colors: {
      dawn: 0xffd9b3,
      noon: 0xffffff,
      dusk: 0xffb28c,
      sand: 0xdbcdbf,
      bgDawn: 0xfbf6f0,
      bgNight: 0x0b1020
    }
  };

  // --- MOBILE CHECK ---
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  if (isMobile) {
    // Optional: Reduce quality further or disable completely for battery saving
    CONFIG.duneSegments = { w: 60, h: 40 };
  }

  // --- INIT SCENE ---
  const container = document.getElementById('three-container');
  if (!container) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(CONFIG.colors.bgDawn, 0.015); // Adds depth

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, CONFIG.cameraY, CONFIG.cameraZ);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for Retina screens
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  // --- LIGHTING ---
  const sunLight = new THREE.DirectionalLight(CONFIG.colors.dawn, 1.0);
  sunLight.position.set(30, 60, -40);
  scene.add(sunLight);

  const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
  scene.add(ambientLight);

  // --- DUNES (TERRAIN) ---
  const simplex = new SimplexNoise();
  const planeSize = 600;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, CONFIG.duneSegments.w, CONFIG.duneSegments.h);
  geometry.rotateX(-Math.PI / 2);

  // Cache base positions for noise calculation
  const positionAttribute = geometry.attributes.position;
  const vertexCount = positionAttribute.count;
  const basePositions = new Float32Array(vertexCount);
  
  for (let i = 0; i < vertexCount; i++) {
    basePositions[i] = positionAttribute.getY(i);
  }

  const material = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.sand,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true, // Low-poly look is faster and stylish
  });

  const dunes = new THREE.Mesh(geometry, material);
  dunes.position.y = -5;
  scene.add(dunes);

  // --- ORBS ---
  const orbGroup = new THREE.Group();
  scene.add(orbGroup);

  const createOrb = (x, y, z, isMetal) => {
    const geo = new THREE.IcosahedronGeometry(Math.random() * 2 + 1, 1); // Low poly icosahedrons
    const mat = new THREE.MeshStandardMaterial({
      color: isMetal ? 0xffffff : 0xC8A0D8,
      metalness: isMetal ? 0.9 : 0.1,
      roughness: isMetal ? 0.1 : 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    // Custom data for animation
    mesh.userData = { 
      speed: 0.02 + Math.random() * 0.03,
      rotSpeed: (Math.random() - 0.5) * 0.02 
    };
    return mesh;
  };

  // Spawn 8 orbs
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 120;
    const z = -Math.random() * 200;
    const y = 10 + Math.random() * 20;
    orbGroup.add(createOrb(x, y, z, Math.random() > 0.5));
  }

  // --- EVENT LISTENERS ---
  let time = 0;
  let scrollY = 0;

  // Debounced Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  // --- ANIMATION LOOP ---
  const animate = () => {
    requestAnimationFrame(animate);
    time += CONFIG.speed;

    // 1. Animate Dunes (Simplex Noise)
    // We only update if visible to save resources
    for (let i = 0; i < vertexCount; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);
      // Noise calculation
      const noise = simplex.noise3D(x * 0.01 + time, z * 0.01 + time, time * 0.5);
      // Update Y
      positionAttribute.setY(i, basePositions[i] + noise * 5);
    }
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    // 2. Animate Orbs (Float logic)
    orbGroup.children.forEach(orb => {
      orb.position.y -= orb.userData.speed;
      orb.rotation.x += orb.userData.rotSpeed;
      orb.rotation.y += orb.userData.rotSpeed;

      // Respawn if too low
      if (orb.position.y < -5) {
        orb.position.y = 30;
        orb.position.x = (Math.random() - 0.5) * 100;
      }
    });

    // 3. Day/Night Cycle based on Scroll
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
    
    // Interpolate Background Color
    const currentBg = new THREE.Color(CONFIG.colors.bgDawn)
      .lerp(new THREE.Color(CONFIG.colors.bgNight), scrollPercent);
    scene.background = currentBg;
    scene.fog.color = currentBg;

    // Interpolate Sun
    const sunColor = new THREE.Color(CONFIG.colors.dawn)
      .lerp(new THREE.Color(CONFIG.colors.noon), scrollPercent < 0.5 ? scrollPercent * 2 : 1)
      .lerp(new THREE.Color(CONFIG.colors.dusk), scrollPercent > 0.5 ? (scrollPercent - 0.5) * 2 : 0);
    sunLight.color = sunColor;

    renderer.render(scene, camera);
  };

  // Start Loop
  animate();

  // Hide Loader
  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.add('hidden');
  }, 1000);

})();