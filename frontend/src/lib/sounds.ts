'use client';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private musicEnabled = true;
  private bgMusic: HTMLAudioElement | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  toggle(on: boolean) {
    this.enabled = on;
  }

  toggleMusic(on: boolean) {
    this.musicEnabled = on;
    if (!on && this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  countdown() {
    this.playTone(800, 0.15, 'square');
  }

  correct() {
    if (!this.enabled) return;
    setTimeout(() => this.playTone(523, 0.1, 'sine'), 0);
    setTimeout(() => this.playTone(659, 0.1, 'sine'), 100);
    setTimeout(() => this.playTone(784, 0.2, 'sine'), 200);
  }

  incorrect() {
    this.playTone(200, 0.3, 'sawtooth');
  }

  joinGame() {
    this.playTone(440, 0.1, 'sine');
    setTimeout(() => this.playTone(660, 0.15, 'sine'), 120);
  }

  questionStart() {
    this.playTone(440, 0.08, 'square');
    setTimeout(() => this.playTone(554, 0.08, 'square'), 100);
    setTimeout(() => this.playTone(659, 0.15, 'square'), 200);
  }

  victory() {
    if (!this.enabled) return;
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine'), i * 80);
    });
  }

  tick() {
    this.playTone(1000, 0.05, 'sine');
  }

  lastSeconds() {
    this.playTone(600, 0.1, 'square');
  }

  startBgMusic() {
    if (!this.musicEnabled) return;
    try {
      const ctx = this.getContext();
      const playNote = (freq: number, startTime: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + dur);
      };

      const melody = [262, 294, 330, 349, 392, 349, 330, 294];
      const now = ctx.currentTime;
      melody.forEach((freq, i) => playNote(freq, now + i * 0.4, 0.35));
    } catch {}
  }

  stopBgMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic = null;
    }
  }
}

export const sounds = new SoundManager();
