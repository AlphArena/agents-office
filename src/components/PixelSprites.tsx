"use client";

// Pixel art sprites using CSS box-shadow technique
// Each "pixel" is a 4x4 box-shadow

const P = 5; // pixel size

function sprite(pixels: [number, number, string][]) {
  return pixels
    .map(([x, y, color]) => `${x * P}px ${y * P}px 0 0 ${color}`)
    .join(",");
}

// ── DESK WITH MONITOR ──
const deskPixels: [number, number, string][] = [
  // desk surface
  ...[...Array(14)].flatMap((_, x) =>
    [0, 1].map((y): [number, number, string] => [x, y + 6, "#b5a27a"])
  ),
  // desk front
  ...[...Array(14)].map((_, x): [number, number, string] => [x, 8, "#9c8b65"]),
  // desk legs
  [1, 9, "#8a7a58"], [1, 10, "#8a7a58"],
  [12, 9, "#8a7a58"], [12, 10, "#8a7a58"],
  // monitor stand
  [6, 5, "#555"], [7, 5, "#555"],
  // monitor
  ...[...Array(6)].flatMap((_, x) =>
    [...Array(4)].map((_, y): [number, number, string] => [x + 4, y + 1, "#222"])
  ),
  // screen
  ...[...Array(4)].flatMap((_, x) =>
    [...Array(2)].map((_, y): [number, number, string] => [x + 5, y + 2, "#1a3a5c"])
  ),
  // screen glow line
  [5, 2, "#3b82f6"], [6, 2, "#2563eb"], [7, 3, "#3b82f6"], [8, 3, "#1d4ed8"],
];

// ── CHAIR ──
const chairPixels: [number, number, string][] = [
  // seat
  ...[...Array(5)].flatMap((_, x) =>
    [0, 1].map((y): [number, number, string] => [x + 1, y + 2, "#3f3f46"])
  ),
  // back
  ...[...Array(5)].flatMap((_, x) =>
    [0, 1, 2].map((y): [number, number, string] => [x + 1, y - 1, "#52525b"])
  ),
  // wheels
  [2, 4, "#27272a"], [4, 4, "#27272a"],
  // stem
  [3, 3, "#333"], [3, 4, "#333"],
];

// ── COFFEE MACHINE ──
const coffeePixels: [number, number, string][] = [
  // body
  ...[...Array(4)].flatMap((_, x) =>
    [...Array(5)].map((_, y): [number, number, string] => [x + 1, y + 2, "#52525b"])
  ),
  // top
  ...[...Array(4)].map((_, x): [number, number, string] => [x + 1, 1, "#71717a"]),
  // spout
  [3, 6, "#333"], [3, 7, "#333"],
  // cup
  [2, 7, "#d4d4d8"], [3, 7, "#d4d4d8"], [4, 7, "#d4d4d8"],
  [2, 8, "#d4d4d8"], [4, 8, "#d4d4d8"],
  // steam
  [3, 0, "rgba(200,200,200,0.4)"],
  // light
  [2, 3, "#22c55e"],
];

// ── SERVER RACK ──
const serverPixels: [number, number, string][] = [
  // frame
  ...[...Array(6)].flatMap((_, x) =>
    [...Array(10)].map((_, y): [number, number, string] => [x + 1, y, "#27272a"])
  ),
  // front panels
  ...[...Array(4)].flatMap((_, x) => [
    [x + 2, 1, "#3f3f46"] as [number, number, string],
    [x + 2, 3, "#3f3f46"] as [number, number, string],
    [x + 2, 5, "#3f3f46"] as [number, number, string],
    [x + 2, 7, "#3f3f46"] as [number, number, string],
  ]),
  // LEDs
  [2, 1, "#22c55e"], [2, 3, "#22c55e"], [2, 5, "#eab308"], [2, 7, "#22c55e"],
];

// ── PLANT ──
const plantPixels: [number, number, string][] = [
  // pot
  ...[...Array(4)].map((_, x): [number, number, string] => [x + 1, 5, "#92400e"]),
  ...[...Array(3)].map((_, x): [number, number, string] => [x + 1, 6, "#78350f"]),
  // leaves
  [3, 2, "#16a34a"], [2, 1, "#22c55e"], [4, 1, "#15803d"],
  [1, 3, "#16a34a"], [5, 3, "#22c55e"],
  [3, 0, "#15803d"], [2, 3, "#22c55e"], [4, 3, "#16a34a"],
  [3, 4, "#166534"],
];

// ── FLOOR TILE ──
const floorTile1 = "#ddd8d0";
const floorTile2 = "#d5d0c8";

// ── AGENT SPRITES (different colors per agent) ──
function agentPixels(skinColor: string, shirtColor: string, hairColor: string): [number, number, string][] {
  return [
    // hair
    [2, 0, hairColor], [3, 0, hairColor], [4, 0, hairColor],
    [1, 1, hairColor], [5, 1, hairColor],
    // head
    [2, 1, skinColor], [3, 1, skinColor], [4, 1, skinColor],
    [2, 2, skinColor], [3, 2, skinColor], [4, 2, skinColor],
    // eyes
    [2, 2, "#222"], [4, 2, "#222"],
    // body
    [1, 3, shirtColor], [2, 3, shirtColor], [3, 3, shirtColor], [4, 3, shirtColor], [5, 3, shirtColor],
    [1, 4, shirtColor], [2, 4, shirtColor], [3, 4, shirtColor], [4, 4, shirtColor], [5, 4, shirtColor],
    [2, 5, shirtColor], [3, 5, shirtColor], [4, 5, shirtColor],
    // legs
    [2, 6, "#374151"], [3, 6, "#374151"], [4, 6, "#374151"],
    [2, 7, "#1f2937"], [4, 7, "#1f2937"],
  ];
}

// ── ORCHESTRATOR SPRITE (bigger, with tie + headset) ──
function orchestratorPixels(): [number, number, string][] {
  return [
    // headset
    [1, 0, "#444"], [2, 0, "#444"], [3, 0, "#444"], [4, 0, "#444"], [5, 0, "#444"],
    [0, 1, "#444"], [6, 1, "#444"],
    [0, 2, "#22c55e"], // mic (green LED)
    // hair
    [2, 1, "#1a1a1a"], [3, 1, "#1a1a1a"], [4, 1, "#1a1a1a"],
    // head
    [2, 2, "#e0b899"], [3, 2, "#e0b899"], [4, 2, "#e0b899"],
    [1, 2, "#e0b899"], [5, 2, "#e0b899"],
    [2, 3, "#e0b899"], [3, 3, "#e0b899"], [4, 3, "#e0b899"],
    // eyes (glasses)
    [2, 3, "#333"], [4, 3, "#333"],
    [1, 3, "#666"], [3, 3, "#666"], [5, 3, "#666"], // glasses frame
    // suit jacket
    [0, 4, "#1e293b"], [1, 4, "#1e293b"], [2, 4, "#1e293b"], [3, 4, "#1e293b"], [4, 4, "#1e293b"], [5, 4, "#1e293b"], [6, 4, "#1e293b"],
    [0, 5, "#1e293b"], [1, 5, "#1e293b"], [2, 5, "#1e293b"], [3, 5, "#1e293b"], [4, 5, "#1e293b"], [5, 5, "#1e293b"], [6, 5, "#1e293b"],
    [1, 6, "#1e293b"], [2, 6, "#1e293b"], [3, 6, "#1e293b"], [4, 6, "#1e293b"], [5, 6, "#1e293b"],
    // tie
    [3, 4, "#dc2626"], [3, 5, "#dc2626"], [3, 6, "#b91c1c"],
    // legs
    [2, 7, "#0f172a"], [3, 7, "#0f172a"], [4, 7, "#0f172a"],
    [2, 8, "#0a0a0a"], [4, 8, "#0a0a0a"],
  ];
}

const agentConfigs = [
  { skin: "#e0b899", shirt: "#7c3aed", hair: "#1c1c1c" }, // Marcus - purple
  { skin: "#f0c8a0", shirt: "#2563eb", hair: "#92400e" }, // Elena - blue
  { skin: "#d4a574", shirt: "#059669", hair: "#111" },     // Kai - green
  { skin: "#f5d0b0", shirt: "#d97706", hair: "#854d0e" },  // Sora - amber
  { skin: "#c68c5c", shirt: "#e11d48", hair: "#0a0a0a" },  // Ravi - rose
  { skin: "#e8c4a0", shirt: "#0891b2", hair: "#18181b" },  // Zara - cyan
];

// ── SPRITE COMPONENT ──
export function PixelSprite({
  pixels,
  scale = 1,
  className = "",
}: {
  pixels: [number, number, string][];
  scale?: number;
  className?: string;
}) {
  const s = P * scale;
  const maxX = Math.max(...pixels.map(([x]) => x)) + 1;
  const maxY = Math.max(...pixels.map(([, y]) => y)) + 1;
  return (
    <div
      className={className}
      style={{
        width: maxX * s,
        height: maxY * s,
        position: "relative",
        imageRendering: "pixelated",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: s,
          height: s,
          boxShadow: pixels
            .map(([x, y, c]) => `${x * s}px ${y * s}px 0 0 ${c}`)
            .join(","),
        }}
      />
    </div>
  );
}

export function Desk({ className = "" }: { className?: string }) {
  return <PixelSprite pixels={deskPixels} className={className} />;
}

export function Chair({ className = "" }: { className?: string }) {
  return <PixelSprite pixels={chairPixels} className={className} />;
}

export function CoffeeMachine({ className = "" }: { className?: string }) {
  return <PixelSprite pixels={coffeePixels} className={className} />;
}

export function ServerRack({ className = "" }: { className?: string }) {
  return <PixelSprite pixels={serverPixels} className={className} />;
}

export function Plant({ className = "" }: { className?: string }) {
  return <PixelSprite pixels={plantPixels} className={className} />;
}

export function AgentSprite({ agentIndex, className = "" }: { agentIndex: number; className?: string }) {
  const config = agentConfigs[agentIndex % agentConfigs.length];
  return <PixelSprite pixels={agentPixels(config.skin, config.shirt, config.hair)} className={className} />;
}

export function OrchestratorSprite({ className = "", scale = 1 }: { className?: string; scale?: number }) {
  return <PixelSprite pixels={orchestratorPixels()} className={className} scale={scale} />;
}

export function FloorPattern({ width, height }: { width: number; height: number }) {
  const tiles: [number, number, string][] = [];
  const cols = Math.ceil(width / 2);
  const rows = Math.ceil(height / 2);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      tiles.push([x, y, (x + y) % 2 === 0 ? floorTile1 : floorTile2]);
    }
  }
  return <PixelSprite pixels={tiles} scale={8} />;
}
