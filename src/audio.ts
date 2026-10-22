/**
 * Original beds made with Web Audio. No recordings and no quoted songs.
 * The default bed is the quiet Linen drone.
 */
import type { ScapeId } from "./settings.ts";

export type Cue = "match" | "win" | "shuffle" | "clink" | "sparkle";

type BedNode = AudioNode & { stop?: (when?: number) => void };

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bed: GainNode | null = null;
  private timer = 0;
  private noise: AudioBuffer | null = null;
  private nodes: BedNode[] = [];
  private scape: ScapeId = "linen";
  private volume = 1;

  setScape(scape: ScapeId): void {
    this.scape = scape;
    if (!this.ctx) return;
    this.stopBed();
    this.startBed();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyVolume(0.12);
  }

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
    master.connect(ctx.destination);
    this.master = master;
    this.applyVolume(1.6);
    this.startBed();
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
    if (kind === "clink") {
      this.blip(1174.66, now, 0.16, 0.07);
      this.blip(1567.98, now + 0.035, 0.09, 0.06);
      return;
    }
    if (kind === "sparkle") {
      this.blip(1318.51, now, 0.1, 0.08);
      this.blip(1760, now + 0.06, 0.08, 0.09);
      this.blip(2093, now + 0.12, 0.06, 0.1);
      return;
    }
    this.blip(659.25, now, 0.34, 0.2);
    this.blip(880, now + 0.08, 0.22, 0.28);
  }

  stop(): void {
    this.stopBed();
    const ctx = this.ctx;
    const master = this.master;
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    }
    window.setTimeout(() => {
      void ctx?.close();
    }, 280);
    this.ctx = null;
    this.master = null;
    this.noise = null;
  }

  private applyVolume(seconds: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const target = Math.max(0.0001, this.volume * 0.045);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(target, now + seconds);
  }

  private startBed(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const bed = ctx.createGain();
    bed.gain.setValueAtTime(0.0001, ctx.currentTime);
    bed.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.6);
    bed.connect(master);
    this.bed = bed;
    if (this.scape === "rain") this.rain(ctx, bed);
    else if (this.scape === "ocean") this.ocean(ctx, bed);
    else if (this.scape === "birds") this.birds(ctx, bed);
    else if (this.scape === "piano") this.piano(ctx, bed);
    else if (this.scape === "forest") this.forest(ctx, bed);
    else this.linen(ctx, bed);
  }

  private stopBed(): void {
    window.clearTimeout(this.timer);
    this.timer = 0;
    const ctx = this.ctx;
    const bed = this.bed;
    if (ctx && bed) {
      const now = ctx.currentTime;
      bed.gain.cancelScheduledValues(now);
      bed.gain.setValueAtTime(Math.max(bed.gain.value, 0.0001), now);
      bed.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    }
    const nodes = this.nodes;
    this.nodes = [];
    this.bed = null;
    window.setTimeout(() => {
      for (const node of nodes) {
        try {
          node.stop?.();
        } catch {
          /* already stopped */
        }
        try {
          node.disconnect();
        } catch {
          /* already disconnected */
        }
      }
    }, 240);
  }

  private linen(ctx: AudioContext, dest: AudioNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.4;
    filter.connect(dest);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.nodes.push(lfo);
    this.tone(ctx, filter, 174.61, 0.22);
    this.tone(ctx, filter, 220, 0.14);
    this.tone(ctx, filter, 261.63, 0.06);
    this.schedule(() => this.pluck(), 6500, 4500);
  }

  private rain(ctx: AudioContext, dest: AudioNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1400;
    filter.connect(dest);
    this.loopNoise(ctx, filter, 0.18);
    this.schedule(() => this.drop(dest), 70, 140);
  }

  private ocean(ctx: AudioContext, dest: AudioNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.nodes.push(lfo);
    const amp = ctx.createGain();
    amp.gain.value = 0.34;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.045;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.12;
    swell.connect(swellGain);
    swellGain.connect(amp.gain);
    swell.start();
    this.nodes.push(swell);
    filter.connect(amp);
    amp.connect(dest);
    this.loopNoise(ctx, filter, 1);
  }

  private birds(ctx: AudioContext, dest: AudioNode): void {
    const air = ctx.createBiquadFilter();
    air.type = "highpass";
    air.frequency.value = 1800;
    air.connect(dest);
    this.loopNoise(ctx, air, 0.035);
    this.schedule(() => this.chirp(dest, 1600, 3400, 0.09), 1400, 2200);
  }

  private piano(ctx: AudioContext, dest: AudioNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    filter.connect(dest);
    this.tone(ctx, filter, 110, 0.08);
    const lead = this.tone(ctx, filter, 392, 0.07);
    const high = this.tone(ctx, filter, 523.25, 0.04);
    const scale = [261.63, 293.66, 329.63, 392, 440, 523.25];
    this.schedule(() => {
      const now = ctx.currentTime;
      const next = scale[Math.floor(Math.random() * scale.length)] ?? 392;
      const upper = scale[Math.floor(Math.random() * scale.length)] ?? 523.25;
      lead.frequency.cancelScheduledValues(now);
      lead.frequency.setValueAtTime(lead.frequency.value, now);
      lead.frequency.exponentialRampToValueAtTime(Math.max(80, next), now + 1.4);
      high.frequency.cancelScheduledValues(now);
      high.frequency.setValueAtTime(Math.max(80, high.frequency.value), now);
      high.frequency.exponentialRampToValueAtTime(Math.max(80, upper), now + 1.8);
    }, 4200, 2800);
  }

  private forest(ctx: AudioContext, dest: AudioNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.connect(dest);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.nodes.push(lfo);
    this.loopNoise(ctx, filter, 0.22);
    this.schedule(() => this.chirp(dest, 1900, 2800, 0.05), 2600, 3400);
  }

  private tone(ctx: AudioContext, dest: AudioNode, freq: number, amount: number): OscillatorNode {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = amount;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    this.nodes.push(osc);
    return osc;
  }

  private loopNoise(ctx: AudioContext, dest: AudioNode, amount: number): void {
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = amount;
    source.connect(gain);
    gain.connect(dest);
    source.start();
    this.nodes.push(source);
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }

  private drop(dest: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900 + Math.random() * 2800;
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(now);
    source.stop(now + 0.09);
  }

  private chirp(dest: AudioNode, from: number, to: number, amount: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + 0.16);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(amount, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  private schedule(fn: () => void, min: number, spread: number): void {
    this.timer = window.setTimeout(() => {
      if (!this.ctx || !this.bed) return;
      fn();
      this.schedule(fn, min, spread);
    }, min + Math.random() * spread);
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
