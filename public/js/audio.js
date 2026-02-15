/**
 * AudioManager - Centralized audio system using Web Audio API
 * Handles sound effects, background music, spatial audio, and volume controls
 */

import { CONFIG } from './config/constants.js';

export class AudioManager {
    constructor() {
        this.context = null;
        this.sounds = new Map(); // Sound buffers
        this.music = new Map(); // Music buffers
        this.activeSounds = []; // Currently playing sounds for pooling
        this.musicSource = null;
        this.musicGainNode = null;

        // Volume controls
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;

        this.isMuted = false;
        this.isInitialized = false;
    }

    /**
     * Initialize the Web Audio API context and gain nodes
     */
    async init() {
        try {
            // Create audio context
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes for volume control hierarchy
            this.masterGain = this.context.createGain();
            this.sfxGain = this.context.createGain();
            this.musicGain = this.context.createGain();

            // Set initial volumes from CONFIG
            this.masterGain.gain.value = CONFIG.AUDIO_MASTER_VOLUME || 0.8;
            this.sfxGain.gain.value = CONFIG.AUDIO_SFX_VOLUME || 1.0;
            this.musicGain.gain.value = CONFIG.AUDIO_MUSIC_VOLUME || 0.4;

            // Connect gain nodes: SFX/Music → Master → Destination
            this.sfxGain.connect(this.masterGain);
            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.context.destination);

            this.isInitialized = true;
            console.log('[AudioManager] Initialized successfully');

            // Resume context if suspended (browser autoplay policy)
            if (this.context.state === 'suspended') {
                await this.context.resume();
            }

            return true;
        } catch (error) {
            console.error('[AudioManager] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Load a sound effect from URL
     * @param {string} name - Identifier for the sound
     * @param {string} url - Path to audio file
     */
    async loadSound(name, url) {
        if (!this.isInitialized) {
            console.warn('[AudioManager] Not initialized, cannot load sound:', name);
            return false;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

            this.sounds.set(name, audioBuffer);
            console.log(`[AudioManager] Loaded sound: ${name}`);
            return true;
        } catch (error) {
            console.error(`[AudioManager] Failed to load sound "${name}" from ${url}:`, error);
            return false;
        }
    }

    /**
     * Load background music from URL
     * @param {string} name - Identifier for the music
     * @param {string} url - Path to audio file
     */
    async loadMusic(name, url) {
        if (!this.isInitialized) {
            console.warn('[AudioManager] Not initialized, cannot load music:', name);
            return false;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

            this.music.set(name, audioBuffer);
            console.log(`[AudioManager] Loaded music: ${name}`);
            return true;
        } catch (error) {
            console.error(`[AudioManager] Failed to load music "${name}" from ${url}:`, error);
            return false;
        }
    }

    /**
     * Play a sound effect with optional parameters
     * @param {string} name - Sound identifier
     * @param {Object} options - Playback options
     * @param {number} options.volume - Volume multiplier (0-1)
     * @param {number} options.pan - Stereo pan (-1 to 1, left to right)
     * @param {number} options.pitchVariation - Random pitch variation (0-1)
     * @param {number} options.delay - Delay before playing (seconds)
     */
    playSound(name, options = {}) {
        if (!this.isInitialized || this.isMuted) return null;

        const buffer = this.sounds.get(name);
        if (!buffer) {
            console.warn(`[AudioManager] Sound not found: ${name}`);
            return null;
        }

        try {
            // Create source node
            const source = this.context.createBufferSource();
            source.buffer = buffer;

            // Apply pitch variation if specified
            if (options.pitchVariation) {
                const variation = 1 + (Math.random() * 2 - 1) * options.pitchVariation;
                source.playbackRate.value = variation;
            }

            // Create gain node for this sound instance
            const gainNode = this.context.createGain();
            gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;

            // Create stereo panner for spatial audio
            let panNode = null;
            if (options.pan !== undefined && this.context.createStereoPanner) {
                panNode = this.context.createStereoPanner();
                panNode.pan.value = Math.max(-1, Math.min(1, options.pan));
            }

            // Connect audio graph: Source → Gain → Pan → SFX Gain → Master → Destination
            source.connect(gainNode);
            if (panNode) {
                gainNode.connect(panNode);
                panNode.connect(this.sfxGain);
            } else {
                gainNode.connect(this.sfxGain);
            }

            // Start playback with optional delay
            const startTime = options.delay ? this.context.currentTime + options.delay : 0;
            source.start(startTime);

            // Track active sound for cleanup
            const soundInstance = { source, gainNode, panNode };
            this.activeSounds.push(soundInstance);

            // Auto-cleanup when sound ends
            source.onended = () => {
                const index = this.activeSounds.indexOf(soundInstance);
                if (index > -1) {
                    this.activeSounds.splice(index, 1);
                }
                // Disconnect nodes
                try {
                    source.disconnect();
                    gainNode.disconnect();
                    if (panNode) panNode.disconnect();
                } catch (e) {
                    // Already disconnected, ignore
                }
            };

            return soundInstance;
        } catch (error) {
            console.error(`[AudioManager] Error playing sound "${name}":`, error);
            return null;
        }
    }

    /**
     * Play background music with looping and fade-in
     * @param {string} name - Music identifier
     * @param {Object} options - Playback options
     * @param {boolean} options.loop - Whether to loop the music
     * @param {number} options.fadeIn - Fade-in duration (seconds)
     * @param {number} options.volume - Volume multiplier (0-1)
     */
    playMusic(name, options = {}) {
        if (!this.isInitialized || this.isMuted) return null;

        const buffer = this.music.get(name);
        if (!buffer) {
            console.warn(`[AudioManager] Music not found: ${name}`);
            return null;
        }

        // Stop existing music if playing
        if (this.musicSource) {
            this.stopMusic(options.fadeOut || 0);
        }

        try {
            // Create source node
            this.musicSource = this.context.createBufferSource();
            this.musicSource.buffer = buffer;
            this.musicSource.loop = options.loop !== undefined ? options.loop : true;

            // Create dedicated gain node for this music track
            this.musicGainNode = this.context.createGain();
            const targetVolume = options.volume !== undefined ? options.volume : 1.0;

            // Apply fade-in if specified
            if (options.fadeIn) {
                this.musicGainNode.gain.value = 0;
                this.musicGainNode.gain.linearRampToValueAtTime(
                    targetVolume,
                    this.context.currentTime + options.fadeIn
                );
            } else {
                this.musicGainNode.gain.value = targetVolume;
            }

            // Connect: Music Source → Music Gain Node → Music Gain → Master → Destination
            this.musicSource.connect(this.musicGainNode);
            this.musicGainNode.connect(this.musicGain);

            // Start playback
            this.musicSource.start(0);

            console.log(`[AudioManager] Playing music: ${name}`);
            return this.musicSource;
        } catch (error) {
            console.error(`[AudioManager] Error playing music "${name}":`, error);
            return null;
        }
    }

    /**
     * Stop currently playing music with optional fade-out
     * @param {number} fadeOut - Fade-out duration (seconds)
     */
    stopMusic(fadeOut = 0) {
        if (!this.musicSource) return;

        try {
            if (fadeOut > 0 && this.musicGainNode) {
                // Fade out before stopping
                this.musicGainNode.gain.linearRampToValueAtTime(
                    0,
                    this.context.currentTime + fadeOut
                );

                setTimeout(() => {
                    if (this.musicSource) {
                        this.musicSource.stop();
                        this.musicSource.disconnect();
                        this.musicSource = null;
                        this.musicGainNode = null;
                    }
                }, fadeOut * 1000);
            } else {
                // Immediate stop
                this.musicSource.stop();
                this.musicSource.disconnect();
                this.musicSource = null;
                this.musicGainNode = null;
            }
        } catch (error) {
            console.error('[AudioManager] Error stopping music:', error);
        }
    }

    /**
     * Set master volume (affects all audio)
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        if (!this.isInitialized) return;
        this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    /**
     * Set SFX volume
     * @param {number} volume - Volume level (0-1)
     */
    setSFXVolume(volume) {
        if (!this.isInitialized) return;
        this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    /**
     * Set music volume
     * @param {number} volume - Volume level (0-1)
     */
    setMusicVolume(volume) {
        if (!this.isInitialized) return;
        this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    /**
     * Toggle mute state
     * @returns {boolean} New mute state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.isInitialized) {
            if (this.isMuted) {
                this.masterGain.gain.value = 0;
            } else {
                this.masterGain.gain.value = CONFIG.AUDIO_MASTER_VOLUME || 0.8;
            }
        }

        return this.isMuted;
    }

    /**
     * Get current mute state
     * @returns {boolean}
     */
    getMuteState() {
        return this.isMuted;
    }

    /**
     * Clean up and dispose of audio resources
     */
    dispose() {
        // Stop all active sounds
        for (const sound of this.activeSounds) {
            try {
                sound.source.stop();
                sound.source.disconnect();
                sound.gainNode.disconnect();
                if (sound.panNode) sound.panNode.disconnect();
            } catch (e) {
                // Already stopped/disconnected
            }
        }
        this.activeSounds = [];

        // Stop music
        this.stopMusic(0);

        // Close audio context
        if (this.context && this.context.state !== 'closed') {
            this.context.close();
        }

        this.isInitialized = false;
        console.log('[AudioManager] Disposed');
    }
}
