document.addEventListener('DOMContentLoaded', () => {
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const canvas = document.getElementById('rta-canvas');
    
    // UI Elements for dynamic updates
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
        requestAnimationFrame(renderRTA);
        
        if (!audioEl.paused) analyser.getByteFrequencyData(dataArray);
        else for(let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 5);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            let barHeight = (dataArray[i] / 255) * canvas.height;
            const r = barHeight * 5 + (25 * (i/dataArray.length));
            const g = 240 * (1 - (i/dataArray.length));
            const b = 255;
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    // --- 2. GESTION LECTURE ---
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

    // --- 3. DYNAMIC TRACK ROUTING (Fetch from Arborescence) ---
    const trackItems = document.querySelectorAll('.mini-track-item');
    
    async function loadTrackData(trackId, epName, title) {
        // Update Audio
        audioEl.src = `audio/${trackId}.mp3`;
        if(isInitialized) audioEl.play();
        btnPlayPause.textContent = '⏸';
        
        // Update Metadata
        currentTrackTitle.textContent = title;
        currentTrackSubtitle.textContent = epName;
        
        // Update Cover (Assuming jpeg extension as per tree, adjust if png)
        playerCover.src = `assets/${trackId}.jpeg`; 
        // Fallback for .png files in your tree (saigon-bound, tinh-bolero-cho-tran)
        playerCover.onerror = function() { this.src = `assets/${trackId}.png`; };

        // Fetch Lyrics
        lyricsDisplay.textContent = "Fetching lyrics from vault...";
        try {
            const response = await fetch(`assets/lyrics/${trackId}.txt`);
            if (response.ok) {
                const text = await response.text();
                lyricsDisplay.textContent = text;
            } else {
                lyricsDisplay.textContent = "// LYRICS NOT FOUND IN VAULT //";
            }
        } catch (error) {
            lyricsDisplay.textContent = "// CONNECTION ERROR //";
        }
    }

    trackItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // UI State update
            trackItems.forEach(t => t.classList.remove('active-track'));
            e.target.classList.add('active-track');
            
            // Extract data
            const trackId = e.target.getAttribute('data-track');
            const epName = e.target.getAttribute('data-ep');
            const title = e.target.textContent.replace(/^\d+\.\s*/, ''); // Remove "1. " from title
            
            initDSP();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            loadTrackData(trackId, epName, title);
        });
    });

    // Initial load attempt for first track lyrics
    loadTrackData('before-the-noise', 'Neon Heartbreaks EP', 'Before the Noise');
});
