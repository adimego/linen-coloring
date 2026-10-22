/**
 * Daily scenes are gallery drawings, not a second set of sketches.
 * The calendar picks the drawing, then the time of day recolors it.
 * Night turns the same drawing around so the repeat is a new composition.
 */
export type Mood = "dawn" | "day" | "dusk" | "night";

export const MOODS: Mood[] = ["dawn", "day", "dusk", "night"];

export type DailyTemplate = {
  id: string;
  source: string;
  /** Inscribed radius of the smallest region, measured on the gallery drawing. */
  minRadiusVu: number;
  minAreaVu: number;
  titles: Record<Mood, string>;
  caption: string;
};

export const TEMPLATES: DailyTemplate[] = [
  {
    id: "monarch",
    source: "monarch",
    minRadiusVu: 5.73,
    minAreaVu: 257.8,
    titles: { dawn: "Monarch at Dawn", day: "Monarch", dusk: "Monarch at Dusk", night: "Night Monarch" },
    caption: "Open wings in amber and black.",
  },
  {
    id: "cat-nap",
    source: "cat-nap",
    minRadiusVu: 5.69,
    minAreaVu: 250,
    titles: { dawn: "Cat at Dawn", day: "Cat Nap", dusk: "Cat at Dusk", night: "Night Cat" },
    caption: "A curled cat in a square of sun.",
  },
  {
    id: "lemon-tea",
    source: "lemon-tea",
    minRadiusVu: 5.48,
    minAreaVu: 212.9,
    titles: { dawn: "Morning Tea", day: "Lemon Tea", dusk: "Tea at Dusk", night: "Night Tea" },
    caption: "Tea, a lemon, and a quiet table.",
  },
  {
    id: "flamingo",
    source: "flamingo",
    minRadiusVu: 5.69,
    minAreaVu: 274.9,
    titles: { dawn: "Flamingo at Dawn", day: "Flamingo", dusk: "Flamingo at Dusk", night: "Night Flamingo" },
    caption: "An elegant flamingo in a sunset lagoon.",
  },
  {
    id: "peony",
    source: "peony",
    minRadiusVu: 5.48,
    minAreaVu: 258.6,
    titles: { dawn: "Peony at Dawn", day: "Peony", dusk: "Peony at Dusk", night: "Night Peony" },
    caption: "A full peony with soft leaves.",
  },
  {
    id: "cherry-blossoms",
    source: "cherry-blossoms",
    minRadiusVu: 5.48,
    minAreaVu: 210.3,
    titles: { dawn: "Cherry Morning", day: "Cherry Blossoms", dusk: "Cherry at Dusk", night: "Night Cherry" },
    caption: "A blossoming tree against the sky.",
  },
  {
    id: "sunflower",
    source: "sunflower",
    minRadiusVu: 5.66,
    minAreaVu: 180.7,
    titles: { dawn: "Sunflower Morning", day: "Sunflower", dusk: "Sunflower at Dusk", night: "Night Sunflower" },
    caption: "A tall sunflower against the sky.",
  },
  {
    id: "tulip-field",
    source: "tulip-field",
    minRadiusVu: 5.6,
    minAreaVu: 190.9,
    titles: { dawn: "Tulips at Dawn", day: "Tulip Field", dusk: "Tulips at Dusk", night: "Night Tulips" },
    caption: "Rows of tulips on stems, and a windmill.",
  },
  {
    id: "still-swan",
    source: "still-swan",
    minRadiusVu: 5.73,
    minAreaVu: 195.2,
    titles: { dawn: "Swan at Dawn", day: "Still Swan", dusk: "Swan at Dusk", night: "Night Swan" },
    caption: "A swan on flat water.",
  },
  {
    id: "garden-robin",
    source: "garden-robin",
    minRadiusVu: 5.65,
    minAreaVu: 198,
    titles: { dawn: "Robin at Dawn", day: "Garden Robin", dusk: "Robin at Dusk", night: "Night Robin" },
    caption: "A robin perched on a branch.",
  },
  {
    id: "garden-fox",
    source: "garden-fox",
    minRadiusVu: 5.48,
    minAreaVu: 265.1,
    titles: { dawn: "Fox at Dawn", day: "Garden Fox", dusk: "Fox at Dusk", night: "Night Fox" },
    caption: "A fox sitting among the flowers.",
  },
  {
    id: "rose-cottage",
    source: "rose-cottage",
    minRadiusVu: 5.7,
    minAreaVu: 273.7,
    titles: { dawn: "Cottage Morning", day: "Rose Cottage", dusk: "Cottage at Dusk", night: "Cottage Lights" },
    caption: "A small house behind a garden fence.",
  },
  {
    id: "lighthouse-cove",
    source: "lighthouse-cove",
    minRadiusVu: 5.55,
    minAreaVu: 239.8,
    titles: { dawn: "Cove at Dawn", day: "Lighthouse Cove", dusk: "Cove at Dusk", night: "Night Light" },
    caption: "A striped light above a small cove.",
  },
  {
    id: "canal-bridge",
    source: "canal-bridge",
    minRadiusVu: 5.73,
    minAreaVu: 281.1,
    titles: { dawn: "Canal Morning", day: "Canal Bridge", dusk: "Canal at Dusk", night: "Night Canal" },
    caption: "A low bridge over still water.",
  },
  {
    id: "snow-cabin",
    source: "snow-cabin",
    minRadiusVu: 5.55,
    minAreaVu: 187.3,
    titles: { dawn: "Cabin at Dawn", day: "Snow Cabin", dusk: "Cabin at Dusk", night: "Cabin Lights" },
    caption: "A cabin under a quiet snow sky.",
  },
  {
    id: "balloon-valley",
    source: "balloon-valley",
    minRadiusVu: 5.51,
    minAreaVu: 249.3,
    titles: { dawn: "Balloons at Dawn", day: "Balloon Valley", dusk: "Balloons at Dusk", night: "Night Balloons" },
    caption: "Three balloons over a wide valley.",
  },
  {
    id: "pink-cupcakes",
    source: "pink-cupcakes",
    minRadiusVu: 5.41,
    minAreaVu: 251.1,
    titles: { dawn: "Morning Cakes", day: "Pink Cupcakes", dusk: "Cupcakes at Dusk", night: "Night Cupcakes" },
    caption: "Three cupcakes on a cake stand.",
  },
  {
    id: "open-rose",
    source: "open-rose",
    minRadiusVu: 5.73,
    minAreaVu: 221.4,
    titles: { dawn: "Rose at Dawn", day: "Open Rose", dusk: "Rose at Dusk", night: "Night Rose" },
    caption: "A rose opened all the way.",
  },
  {
    id: "tide-pool",
    source: "tide-pool",
    minRadiusVu: 5.48,
    minAreaVu: 232.1,
    titles: { dawn: "Pool at Dawn", day: "Tide Pool", dusk: "Pool at Dusk", night: "Night Pool" },
    caption: "Shells and a starfish in a quiet pool.",
  },
  {
    id: "beach-huts",
    source: "beach-huts",
    minRadiusVu: 5.7,
    minAreaVu: 258.4,
    titles: { dawn: "Huts at Dawn", day: "Beach Huts", dusk: "Huts at Dusk", night: "Night Huts" },
    caption: "A row of huts facing the water.",
  },
];
