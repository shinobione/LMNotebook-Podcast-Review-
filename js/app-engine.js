document.addEventListener('DOMContentLoaded', () => {
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
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
        
        // Handle responsive canvas resolution
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        requestAnimationFrame(renderRTA);
        
        if (!audioEl.paused) analyser.getByteFrequencyData(dataArray);
        else for(let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 5);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            let barHeight = (dataArray[i] / 255) * canvas.height;
            // ShinoBiWan Cyber-Palette Gradient
            const r = barHeight * 3 + (10 * (i/dataArray.length));
            const g = 240 * (1 - (i/dataArray.length));
            const b = 255;
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }

    // --- 2. TRANSPORT CONTROLS ---
    btnPlayPause.addEventListener('click', () => {
        initDSP();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        
        if (audioEl.paused) {
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

    audioEl.addEventListener('timeupdate', () => {
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
    });

    // --- 3. DYNAMIC TRACK ROUTING ---
    const trackItems = document.querySelectorAll('.mini-track-item');
    
    async function loadTrackData(trackId, epName, title) {
        // Update Audio
        audioEl.src = `audio/${trackId}.mp3`;
        if(isInitialized) audioEl.play();
        btnPlayPause.textContent = isInitialized ? '⏸' : '▶';
        if(isInitialized) btnPlayPause.style.background = 'var(--accent-cyan)';
        
        // Update Metadata
        currentTrackTitle.textContent = title;
        currentTrackSubtitle.textContent = epName;
        
        // Update Cover (Tente le jpeg d'abord)
        playerCover.src = `assets/${trackId}.jpeg`; 
        // Fallback transparent vers .png si le .jpeg échoue (cas de saigon-bound par ex)
        playerCover.onerror = function() { 
            if (!this.src.endsWith('.png')) {
                this.src = `assets/${trackId}.png`; 
            }
        };

        // Fetch Lyrics
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
