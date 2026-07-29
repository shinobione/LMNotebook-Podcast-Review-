document.addEventListener('DOMContentLoaded', () => {
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const canvas = document.getElementById('rta-canvas');
    
    let audioCtx, analyser, dataArray;
    let isInitialized = false;

    // 1. Initialisation Audio & Routage au premier clic (Browser Policy)
    function initDSP() {
        if (isInitialized) return;
        
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            
            analyser.fftSize = 128;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            const source = audioCtx.createMediaElementSource(audioEl);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            
            isInitialized = true;
            renderRTA();
        } catch (e) {
            console.error("DSP Routing Failed : ", e);
        }
    }

    // 2. Moteur de rendu Spectrum (Canvas 60FPS)
    function renderRTA() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        
        requestAnimationFrame(renderRTA);
        
        // Si en pause, baisse progressive du spectre
        if (!audioEl.paused) {
            analyser.getByteFrequencyData(dataArray);
        } else {
            for(let i = 0; i < dataArray.length; i++) {
                dataArray[i] = Math.max(0, dataArray[i] - 5);
            }
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            // Mapping de hauteur relatif au canvas (32px)
            barHeight = (dataArray[i] / 255) * canvas.height;
            
            // Gradient dynamique (Cyan vers Violet vers Vert)
            const r = barHeight * 5 + (25 * (i/bufferLength));
            const g = 240 * (1 - (i/bufferLength));
            const b = 255;
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    // 3. Gestionnaire de Lecture
    if (btnPlayPause && audioEl) {
        btnPlayPause.addEventListener('click', () => {
            initDSP();
            
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (audioEl.paused) {
                audioEl.play();
                btnPlayPause.textContent = '⏸';
                btnPlayPause.style.boxShadow = '0 0 16px rgba(0, 240, 255, 0.6)';
                btnPlayPause.style.background = 'var(--accent-cyan)';
            } else {
                audioEl.pause();
                btnPlayPause.textContent = '▶';
                btnPlayPause.style.boxShadow = '0 0 12px rgba(29, 185, 84, 0.5)';
                btnPlayPause.style.background = 'var(--spotify-green)';
            }
        });
    }

    // 4. Micro-interactions UI (Cartes Catalogue)
    const epCards = document.querySelectorAll('.ep-card');
    epCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            if(!card.classList.contains('active')) {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 12px rgba(147, 51, 234, 0.15)';
            }
        });
        card.addEventListener('mouseleave', () => {
            if(!card.classList.contains('active')) {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            }
        });
    });
});
