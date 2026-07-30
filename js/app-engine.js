document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS DOM ---
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const spotifyIframe = document.getElementById('spotify-iframe');
    const spotifyContainer = document.getElementById('spotify-container');
    const canvas = document.getElementById('rta-canvas');
    
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackSubtitle = document.getElementById('current-track-subtitle');
    const playerCover = document.getElementById('player-cover');
    const lyricsDisplay = document.getElementById('lyrics-display');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    
    const glitchTargets = document.querySelectorAll('.glitch-target');

    let audioCtx, analyser, dataArray;
    let isInitialized = false;
    let spotifyGhostMode = false;
    let audioEnergy = 0; // Capture la dynamique du master

    // ==========================================
    // MODULE 1 : MOTEUR PARTICULES AUDIO-REACTIVES
    // ==========================================
    const bgCanvas = document.getElementById('bg-particles');
    const bgCtx = bgCanvas.getContext('2d');
    let particlesArray = [];
    let mouse = { x: null, y: null, radius: 150 };

    window.addEventListener('mousemove', (event) => { mouse.x = event.x; mouse.y = event.y; });
    window.addEventListener('mouseout', () => { mouse.x = undefined; mouse.y = undefined; });

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
            if (mouse.x != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let force = (mouse.radius - distance) / mouse.radius;
                
                if (distance < mouse.radius) {
                    this.x -= forceDirectionX * force * 5;
                    this.y -= forceDirectionY * force * 5;
                } else {
                    if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 15;
                    if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 15;
                }
            } else {
                if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 15;
                if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 15;
            }
            
            // Interaction Audio : Plus ça tape, plus ça va vite et gros
            const speedMultiplier = 1 + (audioEnergy * 0.02);
            this.x += this.directionX * 0.2 * speedMultiplier;
            this.y += this.directionY * 0.2 * speedMultiplier;
            
            if(this.x < 0 || this.x > window.innerWidth) this.directionX = -this.directionX;
            if(this.y < 0 || this.y > window.innerHeight) this.directionY = -this.directionY;

            // La taille grossit sur les subs
            const dynamicSize = this.baseSize + (audioEnergy * 0.05);
            this.draw(dynamicSize);
        }
    }

    function initParticles() {
        particlesArray = [];
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
        let numberOfParticles = (bgCanvas.width * bgCanvas.height) / 7000; 
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
    initParticles();
    animateParticles();
    window.addEventListener('resize', () => { initParticles(); });

    // ==========================================
    // MODULE 2 : DSP & RTA ENGINE
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
        } catch (e) {
            console.error("DSP Routing Failed : ", e);
        }
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
            // Moyenne des basses pour extraire l'énergie du Kick/Sub (bins 0 à 10)
            for(let i=0; i<10; i++) localEnergy += dataArray[i];
            audioEnergy = localEnergy / 10; 
        } else if (spotifyGhostMode) {
            for (let i = 0; i < dataArray.length; i++) {
                let maxIntensity = i < 15 ? 255 : (i > 45 ? 120 : 180);
                if (Math.random() > 0.85) dataArray[i] = Math.random() * maxIntensity;
                else dataArray[i] = Math.max(0, dataArray[i] - 12);
            }
            audioEnergy = 0; // Pas de feedback particules sur Spotify pour préserver l'UX
        } else {
            for(let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 5);
            audioEnergy = Math.max(0, audioEnergy - 5);
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
    // MODULE 3 : TYPEWRITER LYRICS FX
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
                // Autoscroll bottom
                textElement.parentElement.scrollTop = textElement.parentElement.scrollHeight;
            } else {
                clearInterval(typingInterval);
            }
        }, speed);
    }

    // ==========================================
    // MODULE 4 : TRANSPORT & EXCLUSION MUTUELLE
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
                pauseLocalPlayer();
                initDSP(); 
                spotifyGhostMode = true; 
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

    window.addEventListener('mousemove', () => {
        if (document.activeElement === spotifyIframe) window.focus();
    });

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
    // MODULE 5 : ROUTING AUDIO & TRIGGER
    // ==========================================
    function triggerGlitch() {
        glitchTargets.forEach(el => {
            el.classList.remove('is-glitching');
            void el.offsetWidth;
            el.classList.add('is-glitching');
            setTimeout(() => { el.classList.remove('is-glitching'); }, 400); 
        });
    }

    const trackItems = document.querySelectorAll('.mini-track-item');
    
    async function loadTrackData(trackId, epName, title) {
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
        playerCover.onerror = function() { 
            if (!this.src.endsWith('.png')) this.src = `assets/${trackId}.png`; 
        };

        lyricsDisplay.textContent = "> INITIALIZING UPLINK...";
        try {
            const response = await fetch(`assets/lyrics/${trackId}.txt`);
            if (response.ok) {
                const text = await response.text();
                // Activation du Terminal Effect
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
