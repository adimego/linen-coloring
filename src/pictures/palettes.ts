import type { Palette } from "./types.ts";

export const palettes: Palette[] = [
  {
    id: "petal",
    name: "Petal",
    colors: ["#f2c1c8", "#f7e3c2", "#c9dfc4", "#c9d4f2", "#e6c8ee", "#f3d5b5", "#b7d8d4", "#e7d3c5"],
  },
  {
    id: "lake",
    name: "Lake",
    colors: ["#b7ddd6", "#f3e6c8", "#c5d8f0", "#f0cfc4", "#d5e2c8", "#e4d4ef", "#f6e7d8", "#c9d5cf"],
  },
  {
    id: "dusk",
    name: "Dusk",
    colors: ["#d7c6ea", "#f6c9ae", "#c9d4ee", "#f0c3cf", "#e8dcb8", "#c5ddd4", "#e6d2c4", "#d5c8e0"],
  },
  {
    id: "meadow",
    name: "Meadow",
    colors: ["#cfe0b8", "#f6e7b2", "#f3cfc4", "#c9e0d4", "#e7d0ea", "#f0ddc4", "#d4e2f2", "#e5d6c4"],
  },
  {
    id: "moon",
    name: "Moon",
    colors: ["#d9d6ef", "#f0e6f2", "#d5e4ea", "#f3e2d4", "#e4d8ee", "#e7eee8", "#f6e4ea", "#ddd4ea"],
  },
];

export function paletteById(id: string): Palette {
  return palettes.find((palette) => palette.id === id) ?? palettes[0];
}
