import type { Clip, PackId, Picture, Region, Stroke } from "./types.ts";

type RegionOpts = {
  evenodd?: boolean;
  transform?: string;
  clipId?: string;
  hintSize?: number;
};

type StrokeOpts = {
  transform?: string;
  fill?: string;
  layer?: "under" | "over";
};

export class Sheet {
  private regions: Region[] = [];
  private strokes: Stroke[] = [];
  private clips: Clip[] = [];

  clip(id: string, d: string): void {
    this.clips.push({ id, d });
  }

  region(
    id: string,
    d: string,
    n: number,
    label: [number, number] | null,
    opts: RegionOpts = {},
  ): void {
    this.regions.push({
      id,
      d,
      n,
      label,
      evenodd: opts.evenodd,
      transform: opts.transform,
      clipId: opts.clipId,
      hintSize: opts.hintSize,
    });
  }

  stroke(d: string, w = 2.4, opts: StrokeOpts = {}): void {
    this.strokes.push({
      d,
      w,
      transform: opts.transform,
      fill: opts.fill,
      layer: opts.layer ?? "over",
    });
  }

  build(spec: { id: string; pack: PackId; title: string; caption: string }): Picture {
    return {
      id: spec.id,
      pack: spec.pack,
      title: spec.title,
      caption: spec.caption,
      viewBox: "0 0 320 460",
      regions: this.regions,
      strokes: this.strokes,
      clips: this.clips,
    };
  }
}
