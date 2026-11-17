import { Rarity } from '../types/game';

class SoundEffectsService {
  private ctx: any = null;
  private enabled: boolean = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): any {
    if (!this.enabled) return null;
    try {
      const w: any = typeof window !== 'undefined' ? window : null;
      if (!w) return null;
      const AudioCtx = w.AudioContext || w.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: 'sine' | 'triangle' | 'sawtooth' | 'square' = 'sine',
    gainVal: number = 0.06,
    delay: number = 0,
    endFreq?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      }
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Ignorer les restrictions audio éventuelles
    }
  }

  public playClick() {
    // Clic sec façon roue libre Campagnolo / cliquet
    this.playTone(920, 0.045, 'triangle', 0.035, 0, 420);
  }

  public playPackRip() {
    // Déchirure plastique/aluminium + montée lumineuse
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 0.22;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(4200, ctx.currentTime + 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Fallback
    }
    this.playTone(340, 0.22, 'sine', 0.045, 0.08, 680);
  }

  public playCardFlip(rarity: Rarity) {
    if (rarity === 'Commune') {
      this.playTone(460, 0.08, 'triangle', 0.04, 0, 560);
    } else if (rarity === 'Peu commune') {
      this.playTone(523.25, 0.1, 'triangle', 0.05);
      this.playTone(659.25, 0.14, 'sine', 0.05, 0.06);
    } else if (rarity === 'Rare') {
      this.playTone(587.33, 0.12, 'triangle', 0.06);
      this.playTone(739.99, 0.14, 'sine', 0.055, 0.06);
      this.playTone(880, 0.22, 'sine', 0.06, 0.12);
    } else if (rarity === 'Épique') {
      this.playTone(523.25, 0.12, 'triangle', 0.065);
      this.playTone(659.25, 0.14, 'triangle', 0.065, 0.07);
      this.playTone(783.99, 0.16, 'sine', 0.07, 0.14);
      this.playTone(1046.5, 0.35, 'sine', 0.075, 0.21);
    } else {
      // Légendaire Arc-en-Ciel : fanfare chromatique majestueuse
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, idx) => {
        this.playTone(n, idx === 4 ? 0.55 : 0.16, 'triangle', 0.075, idx * 0.07);
      });
    }
  }

  public playGodPack() {
    const chord = [440, 554.37, 659.25, 880, 1108.73, 1318.5];
    chord.forEach((n, idx) => {
      this.playTone(n, 0.65, 'sine', 0.065, idx * 0.06);
    });
  }

  public playQuizSuccess(isSnap: boolean) {
    this.playTone(587.33, 0.1, 'sine', 0.055);
    this.playTone(880, 0.22, 'sine', 0.065, 0.07);
    if (isSnap) {
      this.playTone(1174.66, 0.32, 'triangle', 0.07, 0.14);
    }
  }

  public playQuizFail() {
    this.playTone(310, 0.16, 'sawtooth', 0.035, 0, 195);
  }

  public playRoundWin() {
    this.playTone(523.25, 0.12, 'triangle', 0.06);
    this.playTone(783.99, 0.25, 'triangle', 0.065, 0.09);
  }

  public playMatchWin() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((n, i) => {
      this.playTone(n, i === 3 ? 0.45 : 0.14, 'triangle', 0.07, i * 0.09);
    });
  }

  public playUpgradeStar() {
    this.playTone(659.25, 0.12, 'sine', 0.06);
    this.playTone(987.77, 0.15, 'sine', 0.065, 0.07);
    this.playTone(1318.51, 0.35, 'triangle', 0.07, 0.14);
  }
}

export const soundFX = new SoundEffectsService();
