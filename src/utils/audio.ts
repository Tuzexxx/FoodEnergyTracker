// Synthesize sounds using Web Audio API for a fast, asset-free cinematic feel

let audioCtx: AudioContext | null = null;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

export const playSound = (type: 'log' | 'error' | 'click' | 'targetHit') => {
    try {
        initAudio();
        if (!audioCtx) return;

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'log') {
            // Futuristic scanner beep
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);

            // Double beep effect
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(1200, now + 0.15);
            gain2.gain.setValueAtTime(0.05, now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.25);

        } else if (type === 'click') {
            // Subtly UI click
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'error') {
            // low buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.linearRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'targetHit') {
            // Success chord
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now); // A4
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);

            const osc3 = audioCtx.createOscillator();
            const gain3 = audioCtx.createGain();
            osc3.connect(gain3);
            gain3.connect(audioCtx.destination);
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(659.25, now + 0.1); // E5
            gain3.gain.setValueAtTime(0.1, now + 0.1);
            gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc3.start(now + 0.1);
            osc3.stop(now + 0.6);
        }
    } catch (e) {
        // Ignore audio errors (e.g. strict autoplay policies before user interaction)
        console.warn("Audio playback failed", e);
    }
};
