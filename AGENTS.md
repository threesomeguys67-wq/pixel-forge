# PixelForge — Agent & CLI Guide

PixelForge is a professional pixel art studio (Photoshop-class web editor at `/`)
with a **complete HTTP API** so coding agents can create, edit, inspect and export
pixel art programmatically. Everything a human can do in the editor, an agent can
do over HTTP — same document format, same blend math, same library.

- Web editor: open `/` in the preview panel (File > Open from Library shows agent-made art)
- API base (this machine): `http://localhost:3000`
- All JSON responses: `{ "ok": true, ... }` or `{ "ok": false, "error": "..." }`

## Quick start

One-shot render, no project saved (returns PNG binary):

```bash
curl -s -X POST http://localhost:3000/api/pixel/render \
  -H 'Content-Type: application/json' \
  -d '{"width":8,"height":8,"scale":16,"commands":[
        {"op":"rect","from":[0,0],"to":[7,7],"outline":"gold","fill":"#7e2553"},
        {"op":"setPixel","x":3,"y":3,"color":"#fff1e8"},
        {"op":"setPixel","x":4,"y":4,"color":"#fff1e8"}]}' -o art.png
```

Create a project (persists in the library, visible in the web editor) and draw on it:

```bash
# 1. create + draw
curl -s -X POST http://localhost:3000/api/pixel/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sunset","width":64,"height":32,"commands":[
        {"op":"layerAdd","name":"sky","fillWith":"#1a1c2c"},
        {"op":"gradient","layer":"Layer 1","from":"#ffec27","to":"#b13e53","direction":"v","steps":6},
        {"op":"ellipse","from":[24,6],"to":[40,22],"fill":"#ffcd75"},
        {"op":"layerAdd","name":"hills"},
        {"op":"ellipse","layer":"hills","from":[-12,22],"to":[36,52],"fill":"#257179"},
        {"op":"ellipse","layer":"hills","from":[30,26],"to":[78,56],"fill":"#193c3e"}]}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["project"]["id"])'
# -> prints the project id, e.g. "cmwt8ihmn0000o3vxbho77bqb"

# 2. iterate on it (id from step 1)
curl -s -X POST http://localhost:3000/api/pixel/projects/<ID>/commands \
  -H 'Content-Type: application/json' \
  -d '{"commands":[{"op":"noise","layer":"sky","colors":["#fff1e8"],"density":0.02,"seed":7}]}'

# 3. export
curl -s "http://localhost:3000/api/pixel/projects/<ID>/png?scale=8&bg=%231a1c2c" -o sunset.png
```

Inspect art as text (read what you drew — no vision needed):

```bash
curl -s "http://localhost:3000/api/pixel/projects/<ID>/pixels?mode=ascii" | python3 -m json.tool
```

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/api/pixel/projects` | List library projects (ids, sizes, urls) |
| POST   | `/api/pixel/projects` | Create project (body: name, width, height, fps, bg, palette, commands) |
| GET    | `/api/pixel/projects/{id}` | Full project JSON (.pxforge.json format) |
| GET    | `/api/pixel/projects/{id}?format=summary` | Metadata + layer list |
| PUT    | `/api/pixel/projects/{id}` | Replace project (body: name?, project) |
| PATCH  | `/api/pixel/projects/{id}` | Rename (body: name) |
| DELETE | `/api/pixel/projects/{id}` | Delete |
| POST   | `/api/pixel/projects/{id}/commands` | Apply command batch (body: commands) |
| GET    | `/api/pixel/projects/{id}/png` | PNG — query: `scale` (1-16), `frame` (0..N-1 or `sheet`), `bg` |
| GET    | `/api/pixel/projects/{id}/gif` | Animated GIF — query: `scale`, `bg` |
| GET    | `/api/pixel/projects/{id}/pixels` | Read pixels — query: `frame`, `mode` (grid/ascii/json), `rect` (x,y,w,h) |
| POST   | `/api/pixel/projects/{id}/duplicate` | Copy project (body: name?) |
| POST   | `/api/pixel/render` | Stateless render (png or gif), no project created |
| GET    | `/api/pixel/palettes` | Built-in palettes with hex colors |

Tips:
- `POST .../commands?png=1&scale=8&bg=%23rrggbb` returns the rendered PNG directly
  (one request: draw + get image). Same for `POST /api/pixel/projects?png=1...`.
- URLs must stay relative when called from the browser; `curl` on this machine uses
  `http://localhost:3000` directly.
- Query-string `bg` accepts `transparent` (default), `white`, `black` or any `#hex`
  (URL-encode `#` as `%23`).

## Command reference

Common optional fields on drawing commands:
- `layer`: target layer — index (0 = **bottom**) or name string; default = active layer
- `frame`: frame index (0-based); default = active frame (usually 0)
- `opacity`: 0..1, default 1

Colors: `#rgb`, `#rrggbb`, `#rrggbbaa`, named (`gold`, `crimson`, `teal`, `navy`, ...)
or `transparent` (erases to alpha 0).

### Drawing
| op | fields | notes |
| --- | ------ | ----- |
| `setPixel` | x, y, color | single pixel |
| `setPixels` | pixels: [[x,y,color],...] | bulk — fastest way to place many pixels |
| `pencil` | points: [[x,y],...], color, size?, shape?(square/circle), dither?, opacity? | polyline stroke, points auto-connected |
| `line` | from, to, color, size?, dither?, opacity? | Bresenham line |
| `rect` | from, to, fill?, outline?, thickness? | fill and/or outline (give at least one) |
| `ellipse` | from, to, fill?, outline? | bounding box corners |
| `fill` | at, color, tolerance?, contiguous? | flood fill (contiguous:false = global color replace) |
| `fillLayer` | color | fill entire layer |
| `replaceColor` | from, to, tolerance? | |
| `erase` | points? or from+to | polyline or rectangle erase |
| `clear` | — | clear the layer/frame |

### Effects
| op | fields | notes |
| --- | ------ | ----- |
| `invert` | — | invert RGB of opaque pixels |
| `shift` | dx, dy | wrap-around translate (great for scroll animations) |
| `flipH` / `flipV` | — | |
| `outline` | color | outline every opaque region (clean sprite borders) |
| `mirror` | axis: x/y | copy left half mirrored to right (symmetric sprites/faces) |
| `gradient` | from, to, direction: h/v/d, steps? | banded retro gradient with steps |
| `noise` | colors: [], density, seed? | deterministic sparkle/stars |
| `rotate` | dir: cw/ccw | whole document 90° |
| `resizeCanvas` | width, height, anchor? | anchor: center/topleft/... (content placed, not scaled) |
| `scaleImage` | width, height | nearest-neighbor resample of all layers |

### Layers (index 0 = bottom)
| op | fields | notes |
| --- | ------ | ----- |
| `layerAdd` | name?, below?, fillWith? | new layer above active (fills all frames with fillWith) |
| `layerDelete` | layer | required target |
| `layerDuplicate` | layer? | copy above |
| `layerMove` | from, to | reorder |
| `layerProps` | layer?, name?, visible?, opacity?, blend?, locked?, alphaLock? | blend accepts normal/multiply/screen/overlay/darken/lighten/add/difference/... (canvas blend modes) |
| `layerMergeDown` | layer | composites onto the layer below (respecting blend+opacity) |
| `layerFlatten` | — | merge everything into one layer |

### Animation
| op | fields | notes |
| --- | ------ | ----- |
| `frameAdd` | copy? | append frame (copied or empty) |
| `frameDelete` | frame | keep at least one |
| `frameDuration` | frame, duration(ms) | per-frame timing |
| `setFps` | fps | 1..60 |
| `setActive` | layer?, frame? | change the default target for following commands |

## MCP server (Claude Code / Z Code / any MCP client)

A Model Context Protocol server is bundled — it exposes the same engine as MCP tools
(`pixel_create_project`, `pixel_apply_commands`, `pixel_read_pixels`, `pixel_render_png`,
`pixel_export_png`, `pixel_export_gif`, `pixel_help`, ...). PNG results come back as
image content plus a saved file under `exports/`.

```bash
# Claude Code
claude mcp add pixel-art -- bun run /home/z/my-project/mini-services/pixel-mcp/index.ts

# or from the service directory
cd /home/z/my-project/mini-services/pixel-mcp && bun run dev
```

## Browser automation API (window.PixelForgeAPI)

Agents that drive a real browser (Playwright, Puppeteer, agent-browser, CDP, computer
use) get the exact same command engine inside the live editor via
`window.PixelForgeAPI`. Every call returns `{ ok: true, ... }` / `{ ok: false, error }`.

```js
// playwright / agent-browser / devtools console
const api = window.PixelForgeAPI;

await api.execute([
  { op: 'fillLayer', color: '#1a1c2c' },
  { op: 'ellipse', from: [4,4], to: [11,11], fill: '#ffcd75', outline: '#5d275d' },
  { op: 'setPixels', pixels: [[6,7,'#1a1c2c'], [9,7,'#1a1c2c']] },
]);                       // -> { ok: true, applied: 3, summaries: [...] } (undoable)

api.getPixels({ mode: 'ascii' });        // read the art as a text grid
api.getState();                          // size, layers, frames, tool, colors...
api.exportPngDataUrl({ scale: 8 });      // -> { ok: true, dataUrl: 'data:image/png;...' }
api.setTool('pencil'); api.setColor('#ff004d');
api.undo(); api.redo();
api.newDoc(32, 32);
await api.saveToLibrary('My Art');       // persists — HTTP API sees it instantly
await api.openFromLibrary('<id>');
api.help();                              // full reference string
api.on('change', () => console.log('doc changed'));
```

Playwright example:

```js
await page.goto('http://localhost:3000/');
await page.evaluate(() => window.PixelForgeAPI.execute([
  { op: 'rect', from: [2,2], to: [13,13], fill: '#7e2553', outline: 'gold' },
]));
const png = await page.evaluate(() => window.PixelForgeAPI.exportPngDataUrl({ scale: 8 }).dataUrl);
```

Deep-link the editor straight to a library project (great for "make art, then show
the human"): open `/?project=<id>`.

Three integration paths, one engine:

| Path | Best for | Docs |
| ---- | -------- | ---- |
| HTTP REST (`/api/pixel/*`) | headless CLIs, scripts, curl | Endpoints + Command reference above |
| MCP server | Claude Code, Z Code, MCP clients | section above |
| `window.PixelForgeAPI` | browser-driving agents | this section |

## Recipes

Game Boy-style sprite (4-color palette):

```json
{"op":"setPixels","pixels":[[8,4,"#0f380f"],[9,4,"#0f380f"],[7,5,"#306230"],[8,5,"#0f380f"],[9,5,"#0f380f"],[10,5,"#306230"]]}
```

Bouncing-ball animation (creates 4 frames):

```json
[
  {"op":"layerAdd","name":"ball"},
  {"op":"setActive","layer":"ball"},
  {"op":"ellipse","from":[4,4],"to":[10,10],"fill":"#ff004d"},
  {"op":"frameAdd","copy":true},{"op":"clear"},{"op":"ellipse","from":[4,8],"to":[10,14],"fill":"#ff004d"},
  {"op":"frameAdd","copy":true},{"op":"clear"},{"op":"ellipse","from":[4,12],"to":[10,18],"fill":"#ff004d"},
  {"op":"frameAdd","copy":true},{"op":"clear"},{"op":"ellipse","from":[4,16],"to":[10,22],"fill":"#ff004d"},
  {"op":"setFps","fps":8}
]
```

Starfield + dithered shading:

```json
[
  {"op":"fillLayer","color":"#0d1117"},
  {"op":"noise","colors":["#eceff1","#94b0c2"],"density":0.03,"seed":42},
  {"op":"pencil","points":[[2,10],[6,6],[10,10],[14,6]],"color":"#fee761","dither":"50"}
]
```

## Good pixel-art habits for agents

- Work at small sizes (16-64px). Upscale only on export (`scale`).
- Pick a palette first (`GET /api/pixel/palettes` — PICO-8 and Sweetie 16 are safe).
- Build scenes bottom-up: background gradient layer, midground shapes, character,
  then `outline` and light effects (`blend: "screen"`, `add`).
- Use `mirror` for symmetric creatures; `dither` for retro shading; `steps` on
  gradients for banded skies.
- Verify with `pixels?mode=ascii` — you can "see" the art as a luminance grid.
- Everything you create is instantly available to the human in the web editor
  (File > Open from Library).
