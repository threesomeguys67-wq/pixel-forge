// agent-art/generate-twilight-beacon.ts
//
// Agent-authored pixel art, drawn entirely through the PixelForge HTTP API.
// Design: "Twilight Beacon" — 64x64, 11 layers, 4-frame animation.
//
//   bun run agent-art/generate-twilight-beacon.ts
//
// v3 — second VLM critique pass (v2 scored 7.5/10, remaining nits):
//   - moon halo shrunk so it no longer merges with the mid beam at y14-16
//   - beam gets a bright root stub at the lamp + a 3px faded tail at the
//     right edge (sells distance instead of an abrupt canvas cutoff)
//   - reflection column recentered symmetric under the moon (x49+x50 dense)
//   - warm rim-light pixel on the lighthouse's right (beam-facing) edge
//   - mid beam lowered one row to clear the halo
//
// v2 — revised after a VLM art-director critique of the v1 render:
//   - lamp glow moved to its own layer ABOVE the cliff (v1 drew it below,
//     so the lighthouse covered its own glow and the lantern read dark)
//   - beam rebuilt as a true cone (v1's full-width core line read as a
//     parallel-edged band); core is now 2 lines inside the fan
//   - moon reflection strengthened: denser column + widening shimmer dashes
//   - stray left-side wave glints removed (no light rationale)
//   - birds removed (unreadable at 3px)
//   - stars erased below y=24 (clean horizon, less noise)
//   - near mountain range darkened for a crisper silhouette
//   - lighthouse gets dark side outlines, shaded form, wider platform
//   - cloud that intersected the beam corridor removed
//
// Scene plan (horizon at y=40):
//   sky        banded twilight ramp (indigo -> peach), 8 bands
//   stars      seeded noise (upper sky only) + 6 bright "plus" stars
//   glow       (screen) moon halo
//   moon       full moon with craters, upper right
//   mountains  two silhouette ranges (far purple / near dark)
//   clouds     thin twilight streaks
//   water      6 banded gradient rects
//   moonpath   horizon glow + dense dithered reflection + moonlit glints
//   cliff      jagged cliff, striped lighthouse (outlined + shaded)
//   lampglow   (screen) hot lantern core + halos — ABOVE the lighthouse
//   beam       (screen) sweeping light cone, 4 frames: mid/down/up/mid

const BASE = 'http://localhost:3000';

type Px = [number, number, string];
type Cmd = Record<string, unknown>;

const cmds: Cmd[] = [];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/** filled triangle from a peak down to a flat base row */
function tri(peak: [number, number], baseLeft: number, baseRight: number, baseY: number, color: string): Px[] {
  const px: Px[] = [];
  const [pkx, pky] = peak;
  for (let y = pky; y <= baseY; y++) {
    const t = (y - pky) / (baseY - pky);
    const xl = Math.round(pkx + (baseLeft - pkx) * t);
    const xr = Math.round(pkx + (baseRight - pkx) * t);
    for (let x = xl; x <= xr; x++) px.push([x, y, color]);
  }
  return px;
}

/** bright 5-pixel "plus" star */
function star(cx: number, cy: number): Px[] {
  return [
    [cx, cy, '#fff1e8'],
    [cx - 1, cy, '#d8e0f8'], [cx + 1, cy, '#d8e0f8'],
    [cx, cy - 1, '#d8e0f8'], [cx, cy + 1, '#d8e0f8'],
  ];
}

/**
 * light-beam cone fanning from the lamp (11,18) toward the right edge.
 * fan lines form the solid wedge; two brighter lines inside it are the core;
 * a bright stub at the lamp roots the beam; lines stop at x=60 and finish
 * with a faint 3px tail so the beam fades instead of hitting the edge.
 */
function beam(yTop: number, yBot: number, frame: number): void {
  const ORIGIN: [number, number] = [11, 18];
  const X_MAIN = 60;
  const X_END = 63;
  const yAt = (y63: number, x: number) => Math.round(18 + (y63 - 18) * (x - 11) / 52);

  // bright root at the lantern — the beam visibly starts in the lamp glass
  cmds.push({ op: 'line', layer: 'beam', frame, from: [9, 18], to: [13, 18], color: '#fff1d0', opacity: 0.9 });
  cmds.push({ op: 'line', layer: 'beam', frame, from: [9, 19], to: [12, 19], color: '#ffe3a0', opacity: 0.6 });

  // solid fan + faded tail
  for (let y = yTop; y <= yBot; y++) {
    const yMain = yAt(y, X_MAIN);
    cmds.push({ op: 'line', layer: 'beam', frame, from: ORIGIN, to: [X_MAIN, yMain], color: '#ffe3a0', opacity: 0.5 });
    cmds.push({ op: 'line', layer: 'beam', frame, from: [X_MAIN, yMain], to: [X_END, y], color: '#ffe3a0', opacity: 0.18 });
  }

  // brighter core lines inside the wedge (also tail-faded)
  const c1 = Math.round(yTop + (yBot - yTop) * 0.4);
  const c2 = Math.round(yTop + (yBot - yTop) * 0.6);
  for (const cy of [c1, c2]) {
    const cMain = yAt(cy, X_MAIN);
    cmds.push({ op: 'line', layer: 'beam', frame, from: ORIGIN, to: [X_MAIN, cMain], color: '#fff1d0', opacity: 0.8 });
    cmds.push({ op: 'line', layer: 'beam', frame, from: [X_MAIN, cMain], to: [X_END, cy], color: '#fff1d0', opacity: 0.3 });
  }
}

/* ------------------------------------------------------------------ */
/* 1. sky — banded twilight ramp                                       */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerProps', layer: 0, name: 'sky' });
const SKY_BANDS: Array<[number, number, string]> = [
  [0, 5, '#191430'], [6, 11, '#2b1d4e'], [12, 17, '#45286a'], [18, 23, '#6b3377'],
  [24, 28, '#93416f'], [29, 33, '#b85063'], [34, 37, '#d96a58'], [38, 39, '#f28d55'],
];
for (const [y0, y1, c] of SKY_BANDS) {
  cmds.push({ op: 'rect', layer: 'sky', from: [0, y0], to: [63, y1], fill: c });
}

/* ------------------------------------------------------------------ */
/* 2. stars — seeded noise (upper sky) + bright plus-stars             */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'stars' });
cmds.push({
  op: 'noise', layer: 'stars',
  colors: ['#fff1e8', '#cdd6f4', '#ffd9a0'], density: 0.03, seed: 1337,
});
// keep stars out of the lower sky (clean horizon + beam corridor)
cmds.push({ op: 'erase', layer: 'stars', from: [0, 24], to: [63, 63] });

// group A twinkles on frames 1&3, group B on frames 0&2
const STAR_A: Array<[number, number]> = [[8, 5], [27, 4], [39, 6]];
const STAR_B: Array<[number, number]> = [[18, 9], [33, 12], [58, 17]];
const bright: Px[] = [];
for (const [x, y] of STAR_A) bright.push(...star(x, y));
for (const [x, y] of STAR_B) bright.push(...star(x, y));
cmds.push({ op: 'setPixels', layer: 'stars', pixels: bright });

/* ------------------------------------------------------------------ */
/* 3. glow — screen-blended moon halo                                  */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'glow' });
cmds.push({ op: 'layerProps', layer: 'glow', blend: 'screen' });
cmds.push({ op: 'ellipse', layer: 'glow', from: [43, 1], to: [56, 13], fill: '#ff9e7a', opacity: 0.18 });
cmds.push({ op: 'ellipse', layer: 'glow', from: [44, 2], to: [55, 12], fill: '#ffcd75', opacity: 0.35 });

/* ------------------------------------------------------------------ */
/* 4. moon                                                             */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'moon' });
cmds.push({ op: 'ellipse', layer: 'moon', from: [46, 4], to: [53, 11], fill: '#fff6d3' });
cmds.push({
  op: 'setPixels', layer: 'moon',
  pixels: [[48, 6, '#ecd9b0'], [50, 8, '#ecd9b0'], [51, 5, '#f2e2c2'], [47, 9, '#ecd9b0']] as Px[],
});

/* ------------------------------------------------------------------ */
/* 5. mountains — two silhouette ranges (near range darkened in v2)    */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'mountains' });
const far: Px[] = [
  ...tri([20, 30], 6, 34, 39, '#453a6b'),
  ...tri([36, 27], 24, 48, 39, '#453a6b'),
  ...tri([52, 31], 42, 62, 39, '#453a6b'),
];
const near: Px[] = [
  ...tri([28, 33], 16, 40, 39, '#241d3d'),
  ...tri([46, 30], 36, 58, 39, '#241d3d'),
  ...tri([60, 35], 52, 63, 39, '#241d3d'),
];
cmds.push({ op: 'setPixels', layer: 'mountains', pixels: [...far, ...near] });

/* ------------------------------------------------------------------ */
/* 6. clouds — kept clear of the beam corridor                         */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'clouds' });
cmds.push({ op: 'rect', layer: 'clouds', from: [30, 24], to: [43, 24], fill: '#a35a6e', opacity: 0.8 });
cmds.push({ op: 'rect', layer: 'clouds', from: [46, 26], to: [57, 26], fill: '#8a4d6e', opacity: 0.8 });
cmds.push({ op: 'rect', layer: 'clouds', from: [14, 21], to: [22, 21], fill: '#6e4468', opacity: 0.75 });

/* ------------------------------------------------------------------ */
/* 7. water — banded gradient                                          */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'water' });
const WATER_BANDS: Array<[number, number, string]> = [
  [40, 42, '#4c4674'], [43, 46, '#3b3760'], [47, 50, '#302c52'],
  [51, 55, '#262345'], [56, 59, '#1d1b38'], [60, 63, '#15132e'],
];
for (const [y0, y1, c] of WATER_BANDS) {
  cmds.push({ op: 'rect', layer: 'water', from: [0, y0], to: [63, y1], fill: c });
}

/* ------------------------------------------------------------------ */
/* 8. moonpath — horizon glow, dense reflection, moonlit glints        */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'moonpath' });
cmds.push({ op: 'rect', layer: 'moonpath', from: [18, 40], to: [63, 40], fill: '#f28d55', opacity: 0.5 });
cmds.push({ op: 'rect', layer: 'moonpath', from: [20, 41], to: [63, 41], fill: '#d96a58', opacity: 0.3 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[44, 40], [56, 40]], color: '#ffd9a0', opacity: 0.95 });

// reflection column directly under the moon — symmetric about its center (49.5)
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[49, 41], [49, 63]], color: '#ffd9a0', dither: '50', opacity: 1.0 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[50, 41], [50, 63]], color: '#ffd9a0', dither: '50', opacity: 1.0 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[48, 42], [48, 60]], color: '#ffd9a0', dither: '25', opacity: 0.8 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[51, 42], [51, 60]], color: '#ffd9a0', dither: '25', opacity: 0.8 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[47, 44], [47, 56]], color: '#ffd9a0', dither: '25', opacity: 0.7 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[52, 44], [52, 56]], color: '#ffd9a0', dither: '25', opacity: 0.7 });

// widening shimmer dashes — the reflection spreads as it approaches the viewer
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[47, 46], [52, 46]], color: '#ffe8b0', opacity: 0.5 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[46, 50], [53, 50]], color: '#ffd9a0', opacity: 0.4 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[47, 56], [52, 56]], color: '#ffd9a0', opacity: 0.35 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[45, 60], [54, 60]], color: '#f2c48c', opacity: 0.3 });

// bright sparkle cores + a few glints near the moonlight (all within its column)
cmds.push({
  op: 'setPixels', layer: 'moonpath',
  pixels: [[49, 44, '#fff1e8'], [50, 47, '#fff1e8'], [49, 52, '#ffe8b0'], [50, 58, '#ffe8b0']] as Px[],
});
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[56, 43], [60, 43]], color: '#d9a06b', opacity: 0.5 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[55, 47], [58, 47]], color: '#d9a06b', opacity: 0.45 });
cmds.push({ op: 'pencil', layer: 'moonpath', points: [[42, 45], [45, 45]], color: '#d9a06b', opacity: 0.4 });

/* ------------------------------------------------------------------ */
/* 9. cliff + lighthouse (outlined + shaded)                           */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'cliff' });

const cliff: Px[] = [];
for (let y = 34; y <= 63; y++) {
  let right = Math.min(22, 14 + Math.floor((y - 34) / 3.5));
  if ((y * 7) % 13 < 4) right += 1; // jagged edge
  for (let x = 0; x <= right; x++) {
    cliff.push([x, y, y === 34 ? '#262050' : '#1b1633']);
  }
  if (y > 34 && y % 3 !== 0) cliff.push([right, y, '#2f2856']); // moonlit edge
}
for (const [x, y] of [[3, 45], [9, 52], [5, 58], [15, 48], [12, 60], [2, 39]] as Array<[number, number]>) {
  cliff.push([x, y, '#120f26']); // rock texture
}
// wider platform with a moonlit lip
for (let x = 5; x <= 16; x++) cliff.push([x, 33, '#131021']);
for (let x = 6; x <= 15; x++) cliff.push([x, 34, '#3a3157']);
// tower body: white with two red bands, dark outlines both sides, form shading
for (let y = 21; y <= 32; y++) {
  const narrow = y <= 22;
  const x0 = narrow ? 10 : 9;
  const x1 = narrow ? 11 : 12;
  const band = (y >= 24 && y <= 25) || (y >= 28 && y <= 29);
  const body = band ? '#d5212e' : '#f2ead8';
  for (let x = x0; x <= x1; x++) cliff.push([x, y, body]);
  if (!narrow) {
    cliff.push([x0 - 1, y, '#131021']);            // left outline
    cliff.push([x1 + 1, y, '#131021']);            // right outline
    if (!band) {
      cliff.push([x0, y, '#d8cdb8']);              // shadow side (left)
      cliff.push([x1, y, '#fff6d3']);              // moon side (right)
    } else {
      cliff.push([x0, y, '#a51c30']);              // band shadow
      cliff.push([x1, y, '#f04a55']);              // band light
    }
  }
}
// door
cliff.push([10, 31, '#131021'], [11, 31, '#131021'], [10, 32, '#131021'], [11, 32, '#131021']);
// gallery deck (wider than the tower, dark)
for (let x = 8; x <= 13; x++) cliff.push([x, 20, '#131021']);
// lamp room: posts + glass + hot core
cliff.push([9, 18, '#131021'], [12, 18, '#131021']);
cliff.push([10, 18, '#fff1e8'], [11, 18, '#fff1e8']);
for (let x = 9; x <= 12; x++) cliff.push([x, 19, '#ffd9a0']);
cliff.push([10, 19, '#fff1e8'], [11, 19, '#fff1e8']);
// roof + finial
for (let x = 9; x <= 12; x++) cliff.push([x, 17, '#131021']);
cliff.push([10, 16, '#131021'], [11, 16, '#131021'], [10, 15, '#131021']);
// warm rim-light on the beam-facing (right) edge of the lantern + gallery
cliff.push([13, 19, '#ffcd75'], [13, 20, '#ff9e5a']);
// rocks in the surf
for (const [x, y] of [
  [21, 57], [22, 57], [23, 58], [22, 58], [23, 59],
  [18, 54], [19, 54], [19, 55],
  [24, 60], [25, 60], [25, 61], [26, 61],
] as Array<[number, number]>) {
  cliff.push([x, y, '#131021']);
}
cmds.push({ op: 'setPixels', layer: 'cliff', pixels: cliff });

/* ------------------------------------------------------------------ */
/* 10. lampglow — ABOVE the lighthouse (v1 fix)                        */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'lampglow' });
cmds.push({ op: 'layerProps', layer: 'lampglow', blend: 'screen' });
cmds.push({ op: 'ellipse', layer: 'lampglow', from: [5, 12], to: [16, 24], fill: '#ff7654', opacity: 0.3 });
cmds.push({ op: 'ellipse', layer: 'lampglow', from: [7, 14], to: [14, 22], fill: '#ffcd75', opacity: 0.55 });
cmds.push({ op: 'ellipse', layer: 'lampglow', from: [9, 16], to: [12, 20], fill: '#fff1e8', opacity: 0.9 });

/* ------------------------------------------------------------------ */
/* 11. beam — sweeping light cone (4-frame animation)                  */
/* ------------------------------------------------------------------ */

cmds.push({ op: 'layerAdd', name: 'beam' });
cmds.push({ op: 'layerProps', layer: 'beam', blend: 'screen' });

beam(16, 22, 0); // frame 0: mid (clears the moon halo by one row)

// frame 1: beam down + stars A dim
cmds.push({ op: 'frameAdd', copy: true });
cmds.push({ op: 'clear', layer: 'beam', frame: 1 });
beam(23, 33, 1);
for (const [x, y] of STAR_A) cmds.push({ op: 'erase', layer: 'stars', frame: 1, points: [[x, y]] });

// frame 2: beam up + stars A back, B dim
cmds.push({ op: 'frameAdd', copy: true });
cmds.push({ op: 'clear', layer: 'beam', frame: 2 });
beam(3, 13, 2);
cmds.push({
  op: 'setPixels', layer: 'stars', frame: 2,
  pixels: STAR_A.map(([x, y]) => [x, y, '#fff1e8'] as Px),
});
for (const [x, y] of STAR_B) cmds.push({ op: 'erase', layer: 'stars', frame: 2, points: [[x, y]] });

// frame 3: beam mid + stars B back
cmds.push({ op: 'frameAdd', copy: true });
cmds.push({ op: 'clear', layer: 'beam', frame: 3 });
beam(16, 22, 3);
cmds.push({
  op: 'setPixels', layer: 'stars', frame: 3,
  pixels: STAR_B.map(([x, y]) => [x, y, '#fff1e8'] as Px),
});

// even 250ms per frame -> 1s loop
for (let f = 0; f < 4; f++) cmds.push({ op: 'frameDuration', frame: f, duration: 250 });

/* ------------------------------------------------------------------ */
/* run it against the API                                              */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`design built: ${cmds.length} commands`);

  const res = await fetch(`${BASE}/api/pixel/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Twilight Beacon (agent-made)',
      width: 64,
      height: 64,
      commands: cmds,
    }),
  });
  const json: any = await res.json();
  if (!json.ok) {
    console.error('API error:', json.error);
    process.exit(1);
  }
  const id: string = json.project.id;
  console.log('project id:', id);
  console.log('applied:', json.applied, 'commands');

  // exports
  const png = await fetch(`${BASE}/api/pixel/projects/${id}/png?scale=8`);
  await Bun.write('exports/twilight-beacon.png', await png.arrayBuffer());
  console.log('saved exports/twilight-beacon.png');

  const gif = await fetch(`${BASE}/api/pixel/projects/${id}/gif?scale=6`);
  await Bun.write('exports/twilight-beacon.gif', await gif.arrayBuffer());
  console.log('saved exports/twilight-beacon.gif');

  console.log(`\nopen in editor: /?project=${id}`);
}

main();
