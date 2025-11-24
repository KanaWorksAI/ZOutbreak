// Simple synth for game sounds to avoid loading external assets
class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  musicInterval: number | null = null;

  constructor() {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Default volume
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHit() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playZombieGroan() {
    if (!this.ctx || !this.masterGain) return;
    if (Math.random() > 0.3) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50 + Math.random() * 50, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playReload() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Simulate clip out and clip in mechanics
    // Clip Out
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

    // Clip In (delayed)
    osc.frequency.setValueAtTime(300, this.ctx.currentTime + 2.2);
    osc.frequency.linearRampToValueAtTime(500, this.ctx.currentTime + 2.4);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime + 2.2);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 2.25);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.4);

    // Slide rack
    osc.frequency.setValueAtTime(600, this.ctx.currentTime + 2.6);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 2.8);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime + 2.6);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 2.65);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.8);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 3.0);
  }

  playCoin() {
     if (!this.ctx || !this.masterGain) return;
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     
     // High pitch ping
     osc.type = 'sine';
     osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
     osc.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.1);
     
     gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
     gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
     
     osc.connect(gain);
     gain.connect(this.masterGain);
     osc.start();
     osc.stop(this.ctx.currentTime + 0.4);
  }

  playMusic() {
    if (!this.ctx || !this.masterGain) return;
    
    // Stop any existing music loop to prevent overlapping
    if (this.musicInterval) {
        window.clearInterval(this.musicInterval);
    }

    // Notes for C Major Pentatonic Scale (Very consonant and relaxing)
    // C4, D4, E4, G4, A4, C5
    const scale = [
        261.63, 
        293.66, 
        329.63, 
        392.00, 
        440.00, 
        523.25
    ];

    const playNote = () => {
        if (!this.ctx || !this.masterGain) return;
        
        // Select a random note from the scale
        const noteIndex = Math.floor(Math.random() * scale.length);
        let freq = scale[noteIndex];

        // Occasional octave drop for bass warmth
        if (Math.random() > 0.8) freq /= 2;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine'; // Pure, soft tone
        osc.frequency.value = freq;

        const now = this.ctx.currentTime;
        const duration = 4.0; // Long sustain for ambient feel

        // Envelope: Slow attack, long release
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.8); // Slow fade in (attack)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Long fade out (release)

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    };

    // Start the melody
    playNote(); 
    
    // Schedule the next note every 2.5 seconds
    // Use window.setInterval to avoid NodeJS type issues in some environments
    this.musicInterval = window.setInterval(playNote, 2500);
  }
}

export const audioManager = new AudioSystem();