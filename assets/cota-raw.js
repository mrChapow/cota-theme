// 3D Scene Variables
let scene, camera, renderer, cube;
let raycaster, mouse;

// Interaction state
let isRotating = false;
let isMoving = false;
let isDragging = false;

// Input tracking
let lastPointer = { x: 0, y: 0 };
let tapCount = 0;
let tapTimer = null;

// Position persistence - responsive positioning
let cubePosition = window.innerWidth <= 768 ? { x: 0, y: 0.8, z: 0 } : { x: -1.2, y: 0, z: 0 };

// Animation timing
let time = 0;

function init() {
  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

  // Renderer setup
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(10, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
  const pointLight = new THREE.PointLight(0xffffff, 0.3);
  pointLight.position.set(-10, -10, -10);
  scene.add(pointLight);

  // Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Cube
  createCube();

  // Camera
  camera.position.set(0, 0, 5);

  // Events
  addEventListeners();

  // Animate
  animate();
}

function createCube() {
  const geometry = new THREE.BoxGeometry(
    window.innerWidth <= 768 ? 1.0 : 1.5,
    window.innerWidth <= 768 ? 1.0 : 1.5,
    window.innerWidth <= 768 ? 1.0 : 1.5
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x22C55E,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x16A34A,
    emissiveIntensity: 0.1
  });

  cube = new THREE.Mesh(geometry, material);
  cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);

  addCubeLabels();
}

function addCubeLabels() {
  const isMobile = window.innerWidth <= 768;
  const labelDistance = isMobile ? 0.51 : 0.76;
  const labels = [
    { text: 'HELM', position: [0, 0, labelDistance], rotation: [0, 0, 0] },
    { text: 'PREMIUM', position: [labelDistance, 0, 0], rotation: [0, Math.PI/2, 0] },
    { text: 'COTA', position: [0, labelDistance, 0], rotation: [-Math.PI/2, 0, 0] },
    { text: 'DESIGN', position: [-labelDistance, 0, 0], rotation: [0, -Math.PI/2, 0] },
    { text: 'PILOT', position: [0, 0, -labelDistance], rotation: [0, Math.PI, 0] },
    { text: 'PROJECT', position: [0, -labelDistance, 0], rotation: [Math.PI/2, 0, 0] }
  ];

  labels.forEach(label => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label.text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const planeGeometry = new THREE.PlaneGeometry(isMobile ? 0.6 : 0.9, isMobile ? 0.15 : 0.225);
    const textPlane = new THREE.Mesh(planeGeometry, textMaterial);
    textPlane.position.set(...label.position);
    textPlane.rotation.set(...label.rotation);
    cube.add(textPlane);
  });
}

function addEventListeners() {
  const canvas = renderer.domElement;
  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp, { passive: false });

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', onWindowResize);
}

function onPointerDown(event) {
  event.preventDefault();

  const rect = renderer.domElement.getBoundingClientRect();
  const clientX = event.clientX || (event.touches && event.touches[0].clientX);
  const clientY = event.clientY || (event.touches && event.touches[0].clientY);

  lastPointer.x = clientX;
  lastPointer.y = clientY;

  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(cube);

  if (intersects.length > 0) {
    tapCount++;
    if (tapTimer) clearTimeout(tapTimer);

    if (tapCount === 1) {
      tapTimer = setTimeout(() => {
        isRotating = true;
        isDragging = true;
        tapCount = 0;
      }, 200);
    } else if (tapCount === 2) {
      clearTimeout(tapTimer);
      isMoving = true;
      isDragging = true;
      tapCount = 0;
    }
  }
}

function onPointerMove(event) {
  if (!isDragging) return;
  event.preventDefault();

  const clientX = event.clientX || (event.touches && event.touches[0].clientX);
  const clientY = event.clientY || (event.touches && event.touches[0].clientY);

  const deltaX = (clientX - lastPointer.x) * 0.01;
  const deltaY = (clientY - lastPointer.y) * 0.01;

  if (isRotating) {
    cube.rotation.y += deltaX;
    cube.rotation.x += deltaY;
  } else if (isMoving) {
    cube.position.x += deltaX;
    cube.position.y -= deltaY;
  }

  lastPointer.x = clientX;
  lastPointer.y = clientY;
}

function onPointerUp() {
  isRotating = false;
  isMoving = false;
  isDragging = false;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (cube) {
    const isMobile = window.innerWidth <= 768;
    const newSize = isMobile ? 1.0 : 1.5;

    cube.geometry.dispose();
    cube.geometry = new THREE.BoxGeometry(newSize, newSize, newSize);

    cubePosition = isMobile ? { x: 0, y: 0.8, z: 0 } : { x: -1.2, y: 0, z: 0 };
    cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);

    cube.children.forEach(child => cube.remove(child));
    addCubeLabels();
  }
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  if (!isDragging) {
    cube.rotation.y += 0.005;
    cube.position.y = cubePosition.y + Math.sin(time * 0.8) * 0.05;
  }
  renderer.render(scene, camera);
}

// Modal helpers
function handlePurchase() {
  document.getElementById('email-modal')?.classList.add('show');
}
function closeModal() {
  document.getElementById('email-modal')?.classList.remove('show');
}

// Init
window.addEventListener('load', init);
