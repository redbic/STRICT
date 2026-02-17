// ============================
// TTS MODULE - Piper Neural TTS (Client-Side WASM)
// Falls back to Web Speech API if Piper unavailable
// ============================

(function() {
    // Piper voice presets for NPCs and players
    // Each can also have pitchShift (semitones) for uniqueness via Web Audio API
    const PIPER_VOICES = [
        { voiceId: 'en_US-ryan-medium', name: 'Dark Narrator', pitchShift: -4 },
        { voiceId: 'en_US-danny-low', name: 'Deep Voice', pitchShift: -2 },
        { voiceId: 'en_US-hfc_male-medium', name: 'Male NPC', pitchShift: 0 },
        { voiceId: 'en_US-hfc_female-medium', name: 'Female NPC', pitchShift: 0 },
        { voiceId: 'en_GB-alan-medium', name: 'British', pitchShift: 1 },
        { voiceId: 'en_US-lessac-medium', name: 'Clear Voice', pitchShift: 0 },
        { voiceId: 'en_US-john-medium', name: 'John', pitchShift: -1 },
        { voiceId: 'en_US-bryce-medium', name: 'Bryce', pitchShift: 2 },
    ];

    // Dealer voice — pitched down for a dark, otherworldly feel
    const DEALER_VOICE = { voiceId: 'en_US-ryan-medium', name: 'Dealer', pitchShift: -5, rate: 0.85 };

    let isMuted = false;
    let playerVoices = new Map();
    let usedVoiceIndices = new Set();

    // Piper TTS state
    let piperTTS = null;
    let piperLoadPromise = null;
    let piperFailed = false;
    let currentAudio = null;
    let audioCtx = null;

    // Web Speech API fallback state
    let webSpeechVoices = [];

    // Get or create AudioContext for pitch shifting
    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Load Piper TTS module from CDN — returns a promise that resolves when ready
    function loadPiper() {
        if (piperLoadPromise) return piperLoadPromise;
        if (piperFailed) return Promise.resolve(false);

        piperLoadPromise = (async () => {
            try {
                const mod = await import('https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/dist/piper-tts-web.js');
                piperTTS = mod;
                console.log('[TTS] Piper WASM engine loaded');
                return true;
            } catch (err) {
                console.warn('[TTS] Piper load failed, using Web Speech fallback:', err.message);
                piperFailed = true;
                return false;
            }
        })();
        return piperLoadPromise;
    }

    // Download a voice model (called lazily on first use)
    async function ensureVoiceDownloaded(voiceId) {
        if (!piperTTS) return false;
        try {
            const stored = await piperTTS.stored();
            if (stored && stored.includes(voiceId)) return true;
            console.log(`[TTS] Downloading voice: ${voiceId}...`);
            await piperTTS.download(voiceId, (progress) => {
                if (progress.total > 0) {
                    const pct = Math.round((progress.loaded / progress.total) * 100);
                    if (pct % 20 === 0) console.log(`[TTS] ${voiceId}: ${pct}%`);
                }
            });
            console.log(`[TTS] Voice ready: ${voiceId}`);
            return true;
        } catch (err) {
            console.warn(`[TTS] Voice download failed (${voiceId}):`, err.message);
            return false;
        }
    }

    // Play a WAV blob with optional pitch shift (in semitones) and rate change
    async function playWithPitch(wavBlob, pitchShift = 0, rate = 1.0) {
        // Stop any current playback
        if (currentAudio) {
            if (currentAudio.stop) currentAudio.stop();
            else if (currentAudio.pause) currentAudio.pause();
            currentAudio = null;
        }

        if (pitchShift === 0 && rate === 1.0) {
            // No pitch shift — simple Audio playback
            const audio = new Audio();
            audio.src = URL.createObjectURL(wavBlob);
            audio.volume = 0.9;
            currentAudio = audio;
            audio.onended = () => {
                URL.revokeObjectURL(audio.src);
                if (currentAudio === audio) currentAudio = null;
            };
            await audio.play().catch(() => {});
            return;
        }

        // Use Web Audio API for pitch shifting
        try {
            const ctx = getAudioContext();
            const arrayBuf = await wavBlob.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(arrayBuf);

            const source = ctx.createBufferSource();
            source.buffer = audioBuf;

            // Pitch shift via detune (cents = semitones * 100)
            source.detune.value = pitchShift * 100;
            source.playbackRate.value = rate;

            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.9;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            currentAudio = source;
            source.onended = () => {
                if (currentAudio === source) currentAudio = null;
            };
            source.start(0);
        } catch (err) {
            console.warn('[TTS] Pitch playback failed, using plain audio:', err.message);
            // Fallback to plain playback
            const audio = new Audio();
            audio.src = URL.createObjectURL(wavBlob);
            audio.volume = 0.9;
            currentAudio = audio;
            audio.onended = () => {
                URL.revokeObjectURL(audio.src);
                if (currentAudio === audio) currentAudio = null;
            };
            await audio.play().catch(() => {});
        }
    }

    // Initialize
    function initTTS() {
        // Start loading Piper in background (non-blocking)
        loadPiper();

        // Set up Web Speech API as fallback
        if ('speechSynthesis' in window) {
            webSpeechVoices = speechSynthesis.getVoices();
            speechSynthesis.onvoiceschanged = () => {
                webSpeechVoices = speechSynthesis.getVoices();
            };
        }
    }

    function toggleMute() {
        isMuted = !isMuted;
        const btn = document.getElementById('btn-mute-tts');
        if (btn) {
            btn.textContent = isMuted ? '🔇' : '🔊';
            btn.classList.toggle('muted', isMuted);
        }
        if (isMuted) {
            if (currentAudio) {
                if (currentAudio.stop) currentAudio.stop();
                else if (currentAudio.pause) currentAudio.pause();
                currentAudio = null;
            }
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
            }
        }
    }

    // Main speak function — tries Piper, falls back to Web Speech
    async function speak(text, voiceConfig = {}) {
        if (isMuted || !text) return;

        // Wait for Piper to finish loading (if still loading)
        if (!piperFailed && !piperTTS) {
            await loadPiper();
        }

        // Try Piper
        if (piperTTS && !piperFailed) {
            try {
                const voiceId = voiceConfig.voiceId || DEALER_VOICE.voiceId;
                const downloaded = await ensureVoiceDownloaded(voiceId);
                if (downloaded) {
                    const wav = await piperTTS.predict({ text, voiceId });
                    if (isMuted) return;

                    const pitchShift = voiceConfig.pitchShift || 0;
                    const rate = voiceConfig.rate || 1.0;
                    await playWithPitch(wav, pitchShift, rate);
                    return;
                }
            } catch (err) {
                console.warn('[TTS] Piper speak failed:', err.message);
            }
        }

        // Fallback: Web Speech API
        speakWebSpeech(text, voiceConfig);
    }

    // Web Speech API fallback
    function speakWebSpeech(text, voiceConfig = {}) {
        if (!('speechSynthesis' in window)) return;

        if (speechSynthesis.pending || speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = voiceConfig.pitch || 0.3;
        utterance.rate = voiceConfig.rate || 0.7;
        utterance.volume = 0.9;

        if (webSpeechVoices.length > 0) {
            utterance.voice = webSpeechVoices[0];
        }

        speechSynthesis.speak(utterance);
    }

    // Assign a unique Piper voice to a player
    function assignVoice(playerName) {
        if (playerVoices.has(playerName)) {
            return playerVoices.get(playerName);
        }

        let voiceIndex = -1;
        for (let i = 0; i < PIPER_VOICES.length; i++) {
            if (!usedVoiceIndices.has(i)) {
                voiceIndex = i;
                break;
            }
        }

        if (voiceIndex === -1) {
            voiceIndex = Math.floor(Math.random() * PIPER_VOICES.length);
        } else {
            usedVoiceIndices.add(voiceIndex);
        }

        const voiceConfig = { ...PIPER_VOICES[voiceIndex], index: voiceIndex };
        playerVoices.set(playerName, voiceConfig);
        console.log(`[TTS] ${playerName} -> ${voiceConfig.name} (${voiceConfig.voiceId})`);
        return voiceConfig;
    }

    function getPlayerVoice(playerName) {
        if (!playerVoices.has(playerName)) {
            assignVoice(playerName);
        }
        return playerVoices.get(playerName);
    }

    function speakPlayerMessage(playerName, text) {
        const voiceConfig = getPlayerVoice(playerName);
        speak(text, voiceConfig);
    }

    function speakAnnouncement(text) {
        speak(text, { voiceId: 'en_US-lessac-medium', pitchShift: 0, rate: 1.1 });
    }

    function clearVoices() {
        playerVoices.clear();
        usedVoiceIndices.clear();
    }

    function getMuted() {
        return isMuted;
    }

    function getVoiceInfo(playerName) {
        const voice = playerVoices.get(playerName);
        return voice ? voice.name : 'Unknown';
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTTS);
    } else {
        initTTS();
    }

    // Public API
    window.StrictHotelTTS = {
        speak,
        speakPlayerMessage,
        speakAnnouncement,
        assignVoice,
        getPlayerVoice,
        getVoiceInfo,
        clearVoices,
        toggleMute,
        getMuted
    };
})();
