function initAptitudeEffects() {
    // 1. Create Particle Container
    const container = document.createElement('div');
    container.className = 'math-particle-container';
    document.body.appendChild(container);

    // 2. Create Scanner Line
    const scanner = document.createElement('div');
    scanner.className = 'scanner-line';
    document.body.appendChild(scanner);

    // 2.5 Create Holographic Blueprint Overlay
    const overlay = document.createElement('div');
    overlay.className = 'holographic-overlay';
    document.body.appendChild(overlay);

    const symbols = ['∑', 'π', '∫', 'Δ', 'Ω', '√', '∞', 'λ', 'θ', '≈', '≠', '±', '÷', '×', 'log', 'cos', 'sin', 'tan'];
    const formulas = ['S = D / T', '(a+b)² = a²+2ab+b²', 'P = I × R', 'E = mc²', 'A = πr²', 'V = L×W×H', 'x = (-b±√D)/2a'];
    const tags = ['LOGIC', 'MATH', 'REASON', 'ANALYZE', 'SOLVE', 'IQ', 'APTITUDE'];
    
    function createParticle(content, type) {
        const p = document.createElement('div');
        p.className = `math-particle ${type}-particle`;
        p.innerText = content;
        
        const duration = 20 + Math.random() * 25;
        const left = Math.random() * 95;
        const size = type === 'formula' ? 0.9 : (type === 'tag' ? 0.7 : 1.2);
        
        p.style.setProperty('--duration', `${duration}s`);
        p.style.setProperty('--left', `${left}%`);
        p.style.setProperty('--top', '115vh');
        p.style.fontSize = `${size}rem`;
        if(type === 'tag') p.style.letterSpacing = '2px';
        
        container.appendChild(p);
        setTimeout(() => p.remove(), duration * 1000);
    }

    // Diverse particle flow
    setInterval(() => {
        const rand = Math.random();
        if(rand < 0.6) createParticle(symbols[Math.floor(Math.random() * symbols.length)], 'symbol');
        else if(rand < 0.85) createParticle(formulas[Math.floor(Math.random() * formulas.length)], 'formula');
        else createParticle(tags[Math.floor(Math.random() * tags.length)], 'tag');
    }, 2000);

    // 3. New: Digital Data Stream (Matrix-like falling numbers but aptitude themed)
    function createDataStream() {
        const stream = document.createElement('div');
        stream.className = 'data-stream';
        stream.style.left = `${Math.random() * 100}%`;
        stream.innerText = Math.floor(Math.random() * 9999);
        document.body.appendChild(stream);
        setTimeout(() => stream.remove(), 4000);
    }
    setInterval(createDataStream, 500);

    // Apply "Thinking" effect to any brain icons
    const brains = document.querySelectorAll('.fa-brain');
    brains.forEach(b => b.classList.add('brain-thinking'));
}

document.addEventListener('DOMContentLoaded', initAptitudeEffects);
