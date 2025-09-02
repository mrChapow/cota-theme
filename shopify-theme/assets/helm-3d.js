// Helm 3D Interactive JavaScript
// Shopify-integrated version of the 3D cube experience

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
    
    // Renderer setup with soft, holy lighting
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return; // Exit if canvas not found
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Holy, soft lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(-10, -10, -10);
    scene.add(pointLight);

    // Raycaster for picking
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create holy cube
    createCube();

    // Camera position
    camera.position.set(0, 0, 5);

    // Event listeners for precise input
    addEventListeners();

    // Start holy animation
    animate();
}

function createCube() {
    // Get product title from Shopify data or use fallback labels
    const productTitle = window.helmProduct?.title || 'HELM';
    
    // Main cube with holy green metallic material
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

    // Add holy labels that stay properly aligned
    addCubeLabels();
}

function addCubeLabels() {
    // Create labels as children to maintain proper alignment
    const isMobile = window.innerWidth <= 768;
    const labelDistance = isMobile ? 0.51 : 0.76;
    
    // Use product data if available
    const productTitle = window.helmProduct?.title || 'HELM';
    
    const labels = [
        { text: productTitle.toUpperCase(), position: [0, 0, labelDistance], rotation: [0, 0, 0] },
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

        // Holy white background
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Clean black text
        context.fillStyle = 'black';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(label.text, canvas.width / 2, canvas.height / 2);

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true 
        });

        // Create plane for text (properly scaled for cube size)
        const planeGeometry = new THREE.PlaneGeometry(
            isMobile ? 0.6 : 0.9, 
            isMobile ? 0.15 : 0.225
        );
        const textPlane = new THREE.Mesh(planeGeometry, textMaterial);

        // Position and rotate as child of cube
        textPlane.position.set(...label.position);
        textPlane.rotation.set(...label.rotation);
        
        cube.add(textPlane);
    });
}

function addEventListeners() {
    const canvas = renderer.domElement;

    // Mouse events for desktop
    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // Touch events for mobile
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp, { passive: false });

    // Prevent context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function onPointerDown(event) {
    event.preventDefault();
    
    const rect = renderer.domElement.getBoundingClientRect();
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);

    // Store current pointer position
    lastPointer.x = clientX;
    lastPointer.y = clientY;

    // Update mouse for raycasting
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Check if clicking on cube
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(cube);

    if (intersects.length > 0) {
        // Detect if this is a touch device or desktop
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (isTouchDevice) {
            // Mobile/Touch: Use tap counting for double-tap detection
            tapCount++;
            
            if (tapTimer) clearTimeout(tapTimer);
            
            if (tapCount === 1) {
                // Single tap - start rotation mode with minimal delay
                tapTimer = setTimeout(() => {
                    if (!isMoving) { // Don't start rotation if we're already in movement mode
                        isRotating = true;
                        isDragging = true;
                        console.log('🔄 Rotation mode activated');
                    }
                    tapCount = 0;
                }, 150); // Reduced delay from 200ms to 150ms
            } else if (tapCount === 2) {
                // Double tap - start movement mode immediately
                clearTimeout(tapTimer);
                isRotating = false;
                isMoving = true;
                isDragging = true;
                tapCount = 0;
                console.log('🎯 Movement mode activated');
            }
        } else {
            // Desktop/PC: Immediate response for better user experience
            tapCount++;
            
            if (tapTimer) clearTimeout(tapTimer);
            
            if (tapCount === 1) {
                // First click - start rotation immediately
                isRotating = true;
                isDragging = true;
                console.log('🔄 Rotation mode activated');
                
                // Set very short timer to catch potential double-clicks
                tapTimer = setTimeout(() => {
                    tapCount = 0;
                }, 300);
            } else if (tapCount === 2) {
                // Double click - switch to movement mode immediately
                clearTimeout(tapTimer);
                isRotating = false;
                isMoving = true;
                isDragging = true;
                tapCount = 0;
                console.log('🎯 Movement mode activated');
            }
        }
    }
}

function onPointerMove(event) {
    if (!isDragging) return;

    event.preventDefault();

    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);

    // Calculate deltas for 1:1 movement
    const deltaX = (clientX - lastPointer.x) * 0.01;
    const deltaY = (clientY - lastPointer.y) * 0.01;

    if (isRotating) {
        // 1:1 rotation with natural axis preservation
        cube.rotation.y += deltaX;
        cube.rotation.x += deltaY;
    } else if (isMoving) {
        // 1:1 movement anywhere on screen
        cube.position.x += deltaX;
        cube.position.y -= deltaY; // Invert Y for natural movement
    }

    // Update last pointer position
    lastPointer.x = clientX;
    lastPointer.y = clientY;
}

function onPointerUp(event) {
    if (isDragging) {
        console.log('✨ Released - returning to holy idle state');
    }
    
    isRotating = false;
    isMoving = false;
    isDragging = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update cube size and position for mobile/desktop
    if (cube) {
        const isMobile = window.innerWidth <= 768;
        const newSize = isMobile ? 1.0 : 1.5;
        
        cube.geometry.dispose();
        cube.geometry = new THREE.BoxGeometry(newSize, newSize, newSize);
        
        // Update position
        cubePosition = isMobile ? { x: 0, y: 0.8, z: 0 } : { x: -1.2, y: 0, z: 0 };
        cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);
        
        // Recreate labels with proper scaling
        cube.children.forEach(child => cube.remove(child));
        addCubeLabels();
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01;
    
    // Holy idle behavior: soft Y-axis spin and rhythmic bounce
    if (!isDragging) {
        cube.rotation.y += 0.005; // Constant gentle spin
        cube.position.y = cubePosition.y + Math.sin(time * 0.8) * 0.05; // Rhythmic bounce
    }
    
    renderer.render(scene, camera);
}

// Shopify Integration Functions
function handlePurchase() {
    // Check if product is available
    if (window.helmProduct && !window.helmProduct.available) {
        // Show email modal for out of stock items
        const emailModal = document.getElementById('email-modal');
        if (emailModal) {
            emailModal.classList.add('show');
        }
        return false; // Prevent form submission
    }
    
    // Let Shopify handle the add to cart for available products
    return true;
}

function closeModal() {
    const emailModal = document.getElementById('email-modal');
    if (emailModal) {
        emailModal.classList.remove('show');
    }
}

function handleEmailSubmit(event) {
    event.preventDefault();
    
    const email = event.target.querySelector('input[name="contact[email]"]').value;
    const instagram = event.target.querySelector('input[name="contact[note][instagram]"]').value;
    
    // Submit to Shopify
    fetch(event.target.action, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(new FormData(event.target))
    }).then(response => {
        if (response.ok) {
            alert('Thank you! We\'ll contact you when Helm becomes available.');
            closeModal();
        } else {
            alert('There was an error. Please try again.');
        }
    }).catch(error => {
        console.error('Error:', error);
        alert('There was an error. Please try again.');
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Three.js to load
    if (typeof THREE !== 'undefined') {
        init();
    } else {
        // Wait a bit for Three.js to load from CDN
        setTimeout(init, 100);
    }
    
    // Set up modal event listeners
    const emailModal = document.getElementById('email-modal');
    if (emailModal) {
        // Close modal when clicking outside
        emailModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeModal();
            }
        });
    }
    
    // Override buy button click if needed
    const buyButtons = document.querySelectorAll('.buy-button');
    buyButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            if (!handlePurchase()) {
                event.preventDefault();
            }
        });
    });
});

// Make functions available globally for Liquid template usage
window.handlePurchase = handlePurchase;
window.closeModal = closeModal;
window.handleEmailSubmit = handleEmailSubmit;