/**
 * A quiet original drone plus occasional pentatonic tones.
 * Nothing here quotes a song.
 */
export type Cue = "match" | "win" | "shuffle";

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer = 0;
  private oscs: OscillatorNode[] = [];

  start(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 1.6);
    master.connect(ctx.destination);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.4;
    filter.connect(master);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.oscs.push(lfo);

    this.tone(ctx, filter, 174.61, 0.22);
    this.tone(ctx, filter, 220, 0.14);
    this.tone(ctx, filter, 261.63, 0.06);
    this.schedulePluck();
  }

  cue(kind: Cue): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    if (kind === "win") {
      this.blip(523.25, now, 0.7, 0.42);
      this.blip(659.25, now + 0.12, 0.65, 0.46);
      this.blip(783.99, now + 0.24, 0.55, 0.55);
      return;
    }
    if (kind === "shuffle") {
      this.blip(392, now, 0.4, 0.36);
      return;
    }
    this.blip(587.33, now, 0.55, 0.32);
  }

  stop(): void {
    window.clearTimeout(this.timer);
    this.timer = 0;
    const ctx = this.ctx;
    const master = this.master;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    }
    window.setTimeout(() => {
      for (const osc of this.oscs) {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
      }
      void ctx?.close();
    }, 280);
    this.oscs = [];
    this.ctx = null;
    this.master = null;
  }

  private tone(ctx: AudioContext, dest: AudioNode, freq: number, amount: number): void {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = amount;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    this.oscs.push(osc);
  }

  private schedulePluck(): void {
    this.timer = window.setTimeout(() => {
      this.pluck();
      if (this.ctx) this.schedulePluck();
    }, 6500 + Math.random() * 4500);
  }

  private blip(freq: number, when: number, amount: number, length: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.045 * amount, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + length + 0.02);
  }

  private pluck(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const scale = [349.23, 392, 440, 523.25, 587.33];
    const freq = scale[Math.floor(Math.random() * scale.length)] ?? 440;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.8);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 3);
  }
}
