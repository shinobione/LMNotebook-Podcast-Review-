document.addEventListener('DOMContentLoaded', () => {
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const spotifyIframe = document.getElementById('spotify-iframe');
    const canvas = document.getElementById('rta-canvas');
    const btnExportMp3 = document.getElementById('btn-export-mp3');
    
    // UI Elements
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackSubtitle = document.getElementById('current-track-subtitle');
    const playerCover = document.getElementById('player-cover');
    const lyricsDisplay = document.getElementById('lyrics-display');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    
    let audioCtx, analyser, dataArray;
    let isInitialized = false;
    let spotifyGhostMode = false;
    let parsedLyrics = []; 

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
        
        if (!audioEl.paused) {
            analyser.getByteFrequencyData(dataArray);
        } else if (spotifyGhostMode) {
            for (let i = 0; i < dataArray.length; i++) {
                let maxIntensity = i < 15 ? 255 : (i > 45 ? 120 : 180);
                if (Math.random() > 0.85) {
                    dataArray[i] = Math.random() * maxIntensity;
                } else {
                    dataArray[i] = Math.max(0, dataArray[i] - 12);
                }
            }
        } else {
            for(let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 5);
        }
        
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

            if (parsedLyrics.length > 0) {
                const currentTime = audioEl.currentTime;
                let activeIndex = 0;

                for (let i = 0; i < parsedLyrics.length; i++) {
                    if (currentTime >= parsedLyrics[i].time) {
                        activeIndex = i;
                    } else {
                        break;
                    }
                }

                const lineElements = lyricsDisplay.querySelectorAll('.lyrics-line');
                lineElements.forEach((el, index) => {
                    if (index === activeIndex) {
                        if (!el.classList.contains('lyrics-line-active')) {
                            el.classList.add('lyrics-line-active');
                            // CENTRAGE PARFAIT DE LA LIGNE ACTIVE DANS LE VAULT
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        el.classList.remove('lyrics-line-active');
                    }
                });
            }
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

    // --- 4. ROUTING AUDIO LOCAL & PARSING LYRICS (LRC) ---
    const trackItems = document.querySelectorAll('.mini-track-item');
    
    async function updateLyrics(trackId) {
        lyricsDisplay.textContent = "Establishing uplink to Lyrics Vault...";
        parsedLyrics = [];
        try {
            const response = await fetch(`assets/lyrics/${trackId}.txt`);
            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n');
                lyricsDisplay.innerHTML = '';
                
                lines.forEach((line) => {
                    if (line.trim() === '') return;

                    const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d+))?\]/);
                    let totalSeconds = 0;
                    let lyricText = line;

                    if (timeMatch) {
                        const mins = parseInt(timeMatch[1], 10);
                        const secs = parseInt(timeMatch[2], 10);
                        const msStr = timeMatch[3] ? timeMatch[3].padEnd(3, '0').slice(0, 3) : '0';
                        const ms = parseInt(msStr, 10);
                        totalSeconds = mins * 60 + secs + ms / 1000;
                        lyricText = line.replace(/\[.*?\]/g, '').trim();
                    } else {
                        lyricText = line.trim();
                    }

                    parsedLyrics.push({ time: totalSeconds, text: lyricText });

                    const span = document.createElement('span');
                    span.className = 'lyrics-line';
                    span.textContent = lyricText;
                    lyricsDisplay.appendChild(span);
                    lyricsDisplay.appendChild(document.createElement('br'));
                });

                if (parsedLyrics.length > 0) {
                    const firstLine = lyricsDisplay.querySelectorAll('.lyrics-line')[0];
                    firstLine.classList.add('lyrics-line-active');
                    firstLine.scrollIntoView({ behavior: 'auto', block: 'center' });
                }
            } else {
                lyricsDisplay.textContent = "// FILE NOT FOUND IN VAULT //\n\nEnsure " + trackId + ".txt exists in assets/lyrics/";
            }
        } catch (error) {
            lyricsDisplay.textContent = "// CONNECTION ERROR //\n\nLocal file fetch blocked by CORS or file missing.";
        }
    }

    async function loadTrackData(trackId, epName, title) {
        muteSpotifyEmbed(); 
        
        const audioPath = `audio/${trackId}.mp3`;
        audioEl.src = audioPath;
        
        if (btnExportMp3) {
            btnExportMp3.href = audioPath;
            btnExportMp3.setAttribute('download', `${trackId}.mp3`);
        }

        if(isInitialized) audioEl.play();
        btnPlayPause.textContent = isInitialized ? '⏸' : '▶';
        if(isInitialized) btnPlayPause.style.background = 'var(--accent-cyan)';
        
        currentTrackTitle.textContent = title;
        currentTrackSubtitle.textContent = epName;
        
        playerCover.src = `assets/${trackId}.jpeg`; 
        playerCover.onerror = function() { 
            if (!this.src.endsWith('.png')) this.src = `assets/${trackId}.png`; 
        };

        updateLyrics(trackId);
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

    // --- 5. INITIALISATION SYSTEME AU BOOT ---
    if (btnExportMp3) {
        btnExportMp3.href = "audio/before-the-noise.mp3";
        btnExportMp3.setAttribute('download', "before-the-noise.mp3");
    }
    updateLyrics('before-the-noise');
});
