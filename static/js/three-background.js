/**
 * AptitudeLab Nex-Gen 3D Background
 * Features: High-precision wireframe grid + Neural particle field
 * Optimized for Desktop/Laptop screens
 */

let scene, camera, renderer, grid, particles;

function initThree() {
    const container = document.getElementById('three-bg-container');
    if (!container) return;

    // 1. Scene Setup
    scene = new THREE.Scene();
    
    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    camera.position.y = 5;
    camera.rotation.x = -0.3;

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 4. Grid System
    const gridSize = 100;
    const gridDivisions = 50;
    // Colors: #6366f1 (Indigo) for lines, #a855f7 (Purple) for center
    grid = new THREE.GridHelper(gridSize, gridDivisions, 0x6366f1, 0x1e293b);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // 5. Neural Particle Field
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 100;
        positions[i + 1] = Math.random() * 50;
        positions[i + 2] = (Math.random() - 0.5) * 100;

        // Indigo/Purple gradient colors
        colors[i] = Math.random();
        colors[i + 1] = 0.2;
        colors[i + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xa855f7, 2, 100);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Handle Resize
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Slow neural rotation
    particles.rotation.y += 0.001;
    
    // Grid movement simulation
    grid.position.z += 0.05;
    if (grid.position.z > (100 / 50)) {
        grid.position.z = 0;
    }

    // Subtle breathing animation for particles
    const time = Date.now() * 0.001;
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + positions[i]) * 0.01;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', () => {
    initThree();
});
