// main3d.js — Crash-Proof Version
(() => {
  'use strict';

  // --- SAFETY CHECK ---
  if (typeof THREE === 'undefined') {
    console.error('Three.js failed to load.');
    return;
  }

  // --- CONFIG ---
  const CONFIG = {
    cameraY: 18,
    cameraZ: 45,
    speed: 0.002,
    colors: {
      dawn: 0xffd9b3,
      sand: 0xdbcdbf,
      bg: 0xfbf6f0 // simplified background for stability
    }
  };

  // --- SETUP ---
  const container = document.getElementById('three-container');
  if (!container) return; // Stop if container is missing

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.colors.bg);
  scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.012);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, CONFIG.cameraY, CONFIG.cameraZ);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  // --- LIGHTS ---
  const sun = new THREE.DirectionalLight(CONFIG.colors.dawn, 1.2);
  sun.position.set(30, 60, -40);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x442200, 0.5));

  // --- DUNES (MATH BASED) ---
  // We remove SimplexNoise and use a custom wave function
  const planeSize = 600;
  const segs = 80; // Optimized
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, segs, segs);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  const basePosY = new Float32Array(count);
  for (let i = 0; i < count; i++) basePosY[i] = posAttr.getY(i);

  const material = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.sand,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const dunes = new THREE.Mesh(geometry, material);
  dunes.position.y = -6;
  scene.add(dunes);

  // --- ORBS ---
  const orbGroup = new THREE.Group();
  scene.add(orbGroup);
  
  const orbGeo = new THREE.IcosahedronGeometry(2, 0);
  const orbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.8 });

  for(let i=0; i<6; i++){
    const mesh = new THREE.Mesh(orbGeo, orbMat);
    mesh.position.set((Math.random()-0.5)*100, 10 + Math.random()*20, -Math.random()*150);
    mesh.userData = { speed: 0.02 + Math.random()*0.02 };
    orbGroup.add(mesh);
  }

  // --- ANIMATION LOOP ---
  let time = 0;
  
  function getDuneHeight(x, z, t) {
    // A mixture of sine waves to create "dune" ripples
    const y1 = Math.sin(x * 0.02 + t) * 5;
    const y2 = Math.cos(z * 0.03 + t * 0.5) * 4;
    return y1 + y2;
  }

  function animate() {
    requestAnimationFrame(animate);
    time += CONFIG.speed;

    // Animate Waves
    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = getDuneHeight(x, z, time * 5); // Calc new height
      posAttr.setY(i, basePosY[i] + y);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    // Animate Orbs
    orbGroup.children.forEach(orb => {
      orb.position.y -= orb.userData.speed;
      orb.rotation.x += 0.01;
      if(orb.position.y < -5) orb.position.y = 30;
    });

    renderer.render(scene, camera);
  }

  animate();
  
  // Cleanup Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

})();
