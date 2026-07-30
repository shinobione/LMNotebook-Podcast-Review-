document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS DOM ---
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const btnExportMp3 = document.getElementById('btn-export-mp3');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const spotifyIframe = document.getElementById('spotify-iframe');
    const canvas = document.getElementById('rta-canvas');
    
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackSubtitle = document.getElementById('current-track-subtitle');
    const playerCover = document.getElementById('player-cover');
    const lyricsDisplay = document.getElementById('lyrics-display');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    
    const glitchTargets = document.querySelectorAll('.glitch-target');
    const parallaxCards = document.querySelectorAll('.parallax-card');
    const interactiveElements = document.querySelectorAll('.interactive-ui');

    let audioCtx, analyser, dataArray;
    let isInitialized = false;
    let spotifyGhostMode = false;
    let audioEnergy = 0; 
    let isShockwaving = false;
    let currentActiveTrackId = 'before-the-noise'; // Default track

    // ==========================================
    // MODULE 0 : UI SOUND SYNTHESIZER
    // ==========================================
    const uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playUISound(type) {
        if(uiAudioCtx.state === 'suspended') uiAudioCtx.resume();
        const osc = uiAudioCtx.createOscillator();
        const gainNode = uiAudioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(uiAudioCtx.destination);
        
        const now = uiAudioCtx.currentTime;
        if (type === 'hover') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
            gainNode.gain.setValueAtTime(0.02, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'click') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        }
    }

    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => playUISound('hover'));
        el.addEventListener('mousedown', () => playUISound('click'));
    });

    // ==========================================
    // MODULE 1 : CYBER CURSOR & 3D TILT
    // ==========================================
    const cursor = document.getElementById('cursor-main');
    const trail = document.getElementById('cursor-trail');
    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;

    if (window.matchMedia("(pointer: fine)").matches) {
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX; mouseY = e.clientY;
            cursor.style.left = mouseX + 'px';
            cursor.style.top = mouseY + 'px';
        });

        function animateTrail() {
            trailX += (mouseX - trailX) * 0.15;
            trailY += (mouseY - trailY) * 0.15;
            trail.style.left = trailX + 'px';
            trail.style.top = trailY + 'px';
            requestAnimationFrame(animateTrail);
        }
        animateTrail();

        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => { cursor.classList.add('hovering'); trail.classList.add('hovering'); });
            el.addEventListener('mouseleave', () => { cursor.classList.remove('hovering'); trail.classList.remove('hovering'); });
        });

        // 3D Parallax Calculation
        parallaxCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg
                const rotateY = ((x - centerX) / centerX) * 10;
                
                const inner = card.querySelector('.parallax-inner');
                if(inner) inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                const inner = card.querySelector('.parallax-inner');
                if(inner) inner.style.transform = `rotateX(0deg) rotateY(0deg)`;
            });
        });
    }

    // ==========================================
    // MODULE 2 : AUDIO REACTIVE PARTICLES
    // ==========================================
    const bgCanvas = document.getElementById('bg-particles');
    const bgCtx = bgCanvas.getContext('2d');
    let particlesArray = [];

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x; this.y = y; 
            this.directionX = directionX; this.directionY = directionY; 
            this.baseSize = size; this.color = color;
            this.baseX = this.x; this.baseY = this.y;
        }
        draw(currentSize) {
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, currentSize, 0, Math.PI * 2, false);
            bgCtx.fillStyle = this.color;
            bgCtx.fill();
        }
        update() {
            const speedMultiplier = 1 + (audioEnergy * 0.03);
            this.x += this.directionX * 0.2 * speedMultiplier;
            this.y += this.directionY * 0.2 * speedMultiplier;
            
            if(this.x < 0 || this.x > window.innerWidth) this.directionX = -this.directionX;
            if(this.y < 0 || this.y > window.innerHeight) this.directionY = -this.directionY;

            const dynamicSize = this.baseSize + (audioEnergy * 0.05);
            this.draw(dynamicSize);
        }
    }

    function initParticles() {
        particlesArray = [];
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
        let numberOfParticles = (bgCanvas.width * bgCanvas.height) / 8000; 
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 1.5) + 0.5;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 2) - 1;
            let directionY = (Math.random() * 2) - 1;
            particlesArray.push(new Particle(x, y, directionX, directionY, size, 'rgba(0, 240, 255, 0.4)'));
        }
    }
    
    function animateParticles() {
        requestAnimationFrame(animateParticles);
        bgCtx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) { particlesArray[i].update(); }
    }
    initParticles(); animateParticles();
    window.addEventListener('resize', () => initParticles());

    // ==========================================
    // MODULE 3 : DSP & EQ GLOW & SHOCKWAVE
    // ==========================================
    function initDSP() {
        if (isInitialized) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            const source = audioCtx.createMediaElementSource(audioEl);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            isInitialized = true;
            renderRTA();
        } catch (e) { console.error("DSP Routing Failed"); }
    }

    function renderRTA() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        requestAnimationFrame(renderRTA);
        
        let localEnergy = 0;

        if (!audioEl.paused) {
            analyser.getByteFrequencyData(dataArray);
            for(let i=0; i<8; i++) localEnergy += dataArray[i]; // Focus on sub/kick bins
            audioEnergy = localEnergy / 8; 
            
            // Dynamic EQ Glow based on bass energy
            const glowIntensity = Math.min(0.3, audioEnergy / 1000);
            document.documentElement.style.setProperty('--dynamic-glow', `rgba(0, 240, 255, ${glowIntensity})`);

            // Bass-Drop Shockwave Trigger
            if (audioEnergy > 210 && !isShockwaving) {
                document.body.classList.add('matrix-shockwave');
                isShockwaving = true;
                setTimeout(() => { 
                    document.body.classList.remove('matrix-shockwave'); 
                    setTimeout(() => { isShockwaving = false; }, 100); // Debounce
                }, 100);
            }

        } else if (spotifyGhostMode) {
            for (let i = 0; i < dataArray.length; i++) {
                let maxIntensity = i < 15 ? 255 : (i > 45 ? 120 : 180);
                if (Math.random() > 0.85) dataArray[i] = Math.random() * maxIntensity;
                else dataArray[i] = Math.max(0, dataArray[i] - 12);
            }
            audioEnergy = 0; 
            document.documentElement.style.setProperty('--dynamic-glow', `rgba(0, 240, 255, 0.05)`);
        } else {
            for(let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 5);
            audioEnergy = Math.max(0, audioEnergy - 5);
            document.documentElement.style.setProperty('--dynamic-glow', `rgba(0, 240, 255, 0.02)`);
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            let barHeight = (dataArray[i] / 255) * canvas.height;
            const r = barHeight * 3 + (10 * (i/dataArray.length));
            const g = 240 * (1 - (i/dataArray.length));
            const b = 255;
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${r},${g},${b}, 0.8)`;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
        ctx.shadowBlur = 0;
    }

    // ==========================================
    // MODULE 4 : TYPEWRITER LYRICS
    // ==========================================
    let typingInterval;
    function typeWriterEffect(textElement, rawText, speed = 15) {
        clearInterval(typingInterval);
        textElement.textContent = '';
        let i = 0;
        typingInterval = setInterval(() => {
            if (i < rawText.length) {
                textElement.textContent += rawText.charAt(i);
                i++;
                textElement.parentElement.scrollTop = textElement.parentElement.scrollHeight;
            } else {
                clearInterval(typingInterval);
            }
        }, speed);
    }

    // ==========================================
    // MODULE 5 : EXPORT MP3 ONLY (STRICT)
    // ==========================================
    btnExportMp3.addEventListener('click', () => {
        playUISound('click');
        const originalText = btnExportMp3.textContent;
        btnExportMp3.textContent = "[::] PROCESSING DATA...";
        btnExportMp3.style.background = 'var(--accent-red)';
        
        setTimeout(() => {
            const a = document.createElement('a');
            a.href = `audio/${currentActiveTrackId}.mp3`;
            a.download = `SHINOBIWAN_${currentActiveTrackId}_MASTER.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            btnExportMp3.textContent = "[✔] TRANSFER COMPLETE";
            btnExportMp3.style.background = 'var(--spotify-green)';
            
            setTimeout(() => {
                btnExportMp3.textContent = "[⭳] EXPORT MASTER MP3";
                btnExportMp3.style.background = '';
            }, 2000);
        }, 600);
    });

    // ==========================================
    // MODULE 6 : TRANSPORT & MUTUAL EXCLUSION
    // ==========================================
    function pauseLocalPlayer() {
        if (!audioEl.paused) {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
            btnPlayPause.style.boxShadow = '0 0 15px var(--spotify-green)';
        }
    }

    window.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement === spotifyIframe) {
                pauseLocalPlayer(); initDSP(); spotifyGhostMode = true; 
            }
        }, 50);
    });

    function muteSpotifyEmbed() {
        spotifyGhostMode = false;
        if (spotifyIframe) {
            const currentSrc = spotifyIframe.src;
            spotifyIframe.src = "";
            setTimeout(() => { spotifyIframe.src = currentSrc; }, 50);
        }
    }

    btnPlayPause.addEventListener('click', () => {
        initDSP();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        
        if (audioEl.paused) {
            muteSpotifyEmbed();
            audioEl.play();
            btnPlayPause.textContent = '⏸';
            btnPlayPause.style.background = 'var(--accent-cyan)';
            btnPlayPause.style.boxShadow = '0 0 25px var(--accent-cyan)';
        } else {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
            btnPlayPause.style.boxShadow = '0 0 15px var(--spotify-green)';
        }
    });

    btnRewind.addEventListener('click', () => { audioEl.currentTime = Math.max(0, audioEl.currentTime - 10); });
    btnForward.addEventListener('click', () => { audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 10); });

    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        if (!isNaN(audioEl.duration)) audioEl.currentTime = clickPosition * audioEl.duration;
    });

    audioEl.addEventListener('timeupdate', () => {
        if (!isNaN(audioEl.duration)) {
            const percent = (audioEl.currentTime / audioEl.duration) * 100;
            progressBar.style.width = `${percent}%`;
        }
        const formatTime = (time) => {
            if (isNaN(time)) return "00:00";
            const mins = Math.floor(time / 60);
            const secs = Math.floor(time % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        timeCurrent.textContent = formatTime(audioEl.currentTime);
        timeTotal.textContent = formatTime(audioEl.duration);
    });

    audioEl.addEventListener('ended', () => {
        btnPlayPause.textContent = '▶';
        btnPlayPause.style.background = 'var(--spotify-green)';
        btnPlayPause.style.boxShadow = '0 0 15px var(--spotify-green)';
        progressBar.style.width = '0%';
    });

    // ==========================================
    // MODULE 7 : ROUTING AUDIO & GLITCH
    // ==========================================
    function triggerGlitch() {
        glitchTargets.forEach(el => {
            el.classList.remove('is-glitching'); void el.offsetWidth; el.classList.add('is-glitching');
            setTimeout(() => { el.classList.remove('is-glitching'); }, 400); 
        });
    }

    const trackItems = document.querySelectorAll('.mini-track-item');
    
    async function loadTrackData(trackId, epName, title) {
        currentActiveTrackId = trackId; // Store for downloader
        muteSpotifyEmbed(); 
        triggerGlitch(); 
        
        audioEl.src = `audio/${trackId}.mp3`;
        if(isInitialized) audioEl.play();
        btnPlayPause.textContent = isInitialized ? '⏸' : '▶';
        if(isInitialized) {
            btnPlayPause.style.background = 'var(--accent-cyan)';
            btnPlayPause.style.boxShadow = '0 0 25px var(--accent-cyan)';
        }
        
        currentTrackTitle.textContent = title;
        currentTrackSubtitle.textContent = epName;
        
        playerCover.src = `assets/${trackId}.jpeg`; 
        playerCover.onerror = function() { if (!this.src.endsWith('.png')) this.src = `assets/${trackId}.png`; };

        lyricsDisplay.textContent = "> ESTABLISHING SECURE UPLINK...";
        try {
            const response = await fetch(`assets/lyrics/${trackId}.txt`);
            if (response.ok) {
                const text = await response.text();
                typeWriterEffect(lyricsDisplay, text, 10);
            } else {
                typeWriterEffect(lyricsDisplay, `> ERROR 404: /vault/${trackId}.txt NOT FOUND`, 20);
            }
        } catch (error) {
            typeWriterEffect(lyricsDisplay, "> CRITICAL ERROR: CORS BLOCKED FETCH", 20);
        }
    }

    trackItems.forEach(item => {
        item.addEventListener('click', (e) => {
            trackItems.forEach(t => t.classList.remove('active-track'));
            e.target.classList.add('active-track');
            
            const trackId = e.target.getAttribute('data-track');
            const epName = e.target.getAttribute('data-ep');
            const title = e.target.textContent.replace(/^\d+\.\s*/, '');
            
            initDSP();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            loadTrackData(trackId, epName, title);
        });
    });
});
