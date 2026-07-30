document.addEventListener('DOMContentLoaded', () => {
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const spotifyIframe = document.getElementById('spotify-iframe');
    const canvas = document.getElementById('rta-canvas');
    
    // UI Elements
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackSubtitle = document.getElementById('current-track-subtitle');
    const playerCover = document.getElementById('player-cover');
    const lyricsDisplay = document.getElementById('lyrics-display');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    
    let audioCtx, analyser, dataArray;
    let isInitialized = false;
    let spotifyGhostMode = false; // Flag pour l'animation simulée

    // --- 1. MOTEUR DSP & RTA ---
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
        
        // ROUTING VISUEL : Flux Réel vs Flux Ghost (Spotify)
        if (!audioEl.paused) {
            analyser.getByteFrequencyData(dataArray);
        } else if (spotifyGhostMode) {
            // Algorithme de simulation (Ghost DSP)
            for (let i = 0; i < dataArray.length; i++) {
                // Pondération : kick/sub (basses freq) tapent plus fort que le top end
                let maxIntensity = i < 15 ? 255 : (i > 45 ? 120 : 180);
                // Génération de transients aléatoires
                if (Math.random() > 0.85) {
                    dataArray[i] = Math.random() * maxIntensity;
                } else {
                    // Release / Decay naturel
                    dataArray[i] = Math.max(0, dataArray[i] - 12);
                }
            }
        } else {
            // Silence complet
            for(let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 5);
        }
        
        // RENDER DRAW CALLS
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            let barHeight = (dataArray[i] / 255) * canvas.height;
            const r = barHeight * 3 + (10 * (i/dataArray.length));
            const g = 240 * (1 - (i/dataArray.length));
            const b = 255;
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }

    // --- 2. EXCLUSION MUTUELLE AUDIO ---
    function pauseLocalPlayer() {
        if (!audioEl.paused) {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
        }
    }

    // TRIGGER : Détection d'interaction avec Spotify via la perte de focus
    window.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement === spotifyIframe) {
                pauseLocalPlayer();
                initDSP(); // On force l'init du canvas si ce n'est pas fait
                spotifyGhostMode = true; // Activation du faux RTA
            }
        }, 50);
    });

    // TRIGGER : Reset Spotify via recharge de l'iframe
    function muteSpotifyEmbed() {
        spotifyGhostMode = false; // Coupe le faux RTA
        if (spotifyIframe) {
            const currentSrc = spotifyIframe.src;
            spotifyIframe.src = "";
            setTimeout(() => { spotifyIframe.src = currentSrc; }, 50);
        }
    }

    window.addEventListener('mousemove', () => {
        if (document.activeElement === spotifyIframe) window.focus();
    });

    // --- 3. TRANSPORT CONTROLS ---
    btnPlayPause.addEventListener('click', () => {
        initDSP();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        
        if (audioEl.paused) {
            muteSpotifyEmbed();
            audioEl.play();
            btnPlayPause.textContent = '⏸';
            btnPlayPause.style.background = 'var(--accent-cyan)';
        } else {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
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
        progressBar.style.width = '0%';
    });

    // --- 4. ROUTING AUDIO LOCAL ---
    const trackItems = document.querySelectorAll('.mini-track-item');
    
    async function loadTrackData(trackId, epName, title) {
        muteSpotifyEmbed(); // Coupe l'iframe externe
        
        audioEl.src = `audio/${trackId}.mp3`;
        if(isInitialized) audioEl.play();
        btnPlayPause.textContent = isInitialized ? '⏸' : '▶';
        if(isInitialized) btnPlayPause.style.background = 'var(--accent-cyan)';
        
        currentTrackTitle.textContent = title;
        currentTrackSubtitle.textContent = epName;
        
        playerCover.src = `assets/${trackId}.jpeg`; 
        playerCover.onerror = function() { 
            if (!this.src.endsWith('.png')) this.src = `assets/${trackId}.png`; 
        };

        lyricsDisplay.textContent = "Establishing uplink to Lyrics Vault...";
        try {
            const response = await fetch(`assets/lyrics/${trackId}.txt`);
            if (response.ok) {
                const text = await response.text();
                lyricsDisplay.textContent = text;
            } else {
                lyricsDisplay.textContent = "// FILE NOT FOUND IN VAULT //\n\nEnsure " + trackId + ".txt exists in assets/lyrics/";
            }
        } catch (error) {
            lyricsDisplay.textContent = "// CONNECTION ERROR //\n\nLocal file fetch blocked by CORS or file missing.";
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
