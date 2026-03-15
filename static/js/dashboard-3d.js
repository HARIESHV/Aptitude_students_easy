/**
 * Dashboard 3D & Polygon Background
 * Handles the rotating wireframe sphere (Three.js)
 * and the moving polygon grid network (Canvas).
 */

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
});

function initDashboard3D() {
    initSphere();
    initPolygonGrid();
}

// ─── 3D WIREFRAME SPHERE (THREE.JS) ───────────────────────────
function initSphere() {
    const container = document.getElementById('sphere-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const size = 500;
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    // Create wireframe sphere
    const geometry = new THREE.SphereGeometry(2, 24, 24);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x7b61ff, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Add glowing points at intersections
    const pointsGeometry = new THREE.SphereGeometry(2, 24, 24);
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0xa855f7,
        size: 0.05,
        transparent: true,
        opacity: 0.8
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);

    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        
        // Smooth rotation
        sphere.rotation.y += 0.005;
        sphere.rotation.x += 0.002;
        points.rotation.y += 0.005;
        points.rotation.x += 0.002;

        // Mouse Parallax
        sphere.position.x += (mouseX * 2 - sphere.position.x) * 0.05;
        sphere.position.y += (-mouseY * 2 - sphere.position.y) * 0.05;
        points.position.x = sphere.position.x;
        points.position.y = sphere.position.y;

        renderer.render(scene, camera);
    }
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        // Sphere is fixed size in its container, no complex resize needed
    });
}

// ─── POLYGON GRID NETWORK (CANVAS) ─────────────────────────────
function initPolygonGrid() {
    const canvas = document.getElementById('polygon-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height, points = [];
    const maxDist = 150;
    const pointCount = 60;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    class Point {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
    }

    function init() {
        resize();
        points = [];
        for (let i = 0; i < pointCount; i++) points.push(new Point());
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        
        points.forEach(p => {
            p.update();
            
            // Add subtle parallax to local points
            const px = p.x + mouseX * 30;
            const py = p.y + mouseY * 30;

            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(123, 97, 255, 0.3)';
            ctx.fill();
        });

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
                if (dist < maxDist) {
                    const ix = points[i].x + mouseX * 30;
                    const iy = points[i].y + mouseY * 30;
                    const jx = points[j].x + mouseX * 30;
                    const jy = points[j].y + mouseY * 30;

                    ctx.beginPath();
                    ctx.moveTo(ix, iy);
                    ctx.lineTo(jx, jy);
                    ctx.strokeStyle = `rgba(123, 97, 255, ${0.1 * (1 - dist / maxDist)})`;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    init();
    draw();
}

document.addEventListener('DOMContentLoaded', initDashboard3D);
