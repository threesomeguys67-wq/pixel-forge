# CLAUDE.md

PixelForge — a professional pixel art studio (Next.js 16 + React + Canvas 2D) with a
full agent/CLI API. This machine hosts the running app on port 3000.

**Read `AGENTS.md` for the complete API + command reference.** Quick summary:

## Creating pixel art over HTTP

```bash
# one-shot render (no project saved) — returns PNG
curl -s -X POST http://localhost:3000/api/pixel/render \
  -H 'Content-Type: application/json' \
  -d '{"width":16,"height":16,"scale":8,"commands":[
        {"op":"fillLayer","color":"#1a1c2c"},
        {"op":"ellipse","from":[4,4],"to":[11,11],"fill":"#ffcd75","outline":"#5d275d"},
        {"op":"setPixels","pixels":[[6,7,"#1a1c2c"],[9,7,"#1a1c2c"]]},
        {"op":"line","from":[6,10],"to":[9,10],"color":"#b13e53"}]}' -o art.png
```

```bash
# persistent project (shows up in the web editor library)
curl -s -X POST http://localhost:3000/api/pixel/projects -H 'Content-Type: application/json' \
  -d '{"name":"My Art","width":32,"height":32,"commands":[...]}'      # -> id
curl -s -X POST http://localhost:3000/api/pixel/projects/<ID>/commands \
  -H 'Content-Type: application/json' -d '{"commands":[...]}'          # iterate
curl -s "http://localhost:3000/api/pixel/projects/<ID>/png?scale=8" -o final.png
curl -s "http://localhost:3000/api/pixel/projects/<ID>/pixels?mode=ascii"  # inspect as text
```

Key endpoints: `GET/POST /api/pixel/projects`, `POST /api/pixel/projects/{id}/commands`,
`GET .../png|gif|pixels`, `POST /api/pixel/render`, `GET /api/pixel/palettes`.

## Browser automation (window.PixelForgeAPI)

When driving the live editor in a real browser (Playwright / Puppeteer / agent-browser),
the same command engine is exposed as `window.PixelForgeAPI`:

```js
await window.PixelForgeAPI.execute([{ op: 'fillLayer', color: '#1a1c2c' },
                                    { op: 'ellipse', from: [4,4], to: [11,11], fill: '#ffcd75' }]);
window.PixelForgeAPI.getPixels({ mode: 'ascii' }).text;   // read art as text
window.PixelForgeAPI.exportPngDataUrl({ scale: 8 });      // PNG data URL
await window.PixelForgeAPI.saveToLibrary('My Art');       // share with the HTTP API
```

Deep-link the editor to a library project with `/?project=<id>`. Full reference:
`window.PixelForgeAPI.help()` or AGENTS.md.

## MCP tools

An MCP server is bundled (tools: `pixel_create_project`, `pixel_apply_commands`,
`pixel_read_pixels`, `pixel_render_png`, `pixel_export_png`, ...). It is already
running in the background:

```bash
claude mcp add pixel-art -- bun run /home/z/my-project/mini-services/pixel-mcp/index.ts
```

## Project layout

- `src/components/pixel/` — the React editor (store, canvas engine, panels, dialogs)
- `src/lib/pixel-server/` — server kernel: command engine, W3C blend math, PNG/GIF render
- `src/app/api/pixel/` — REST API routes (agent-facing)
- `mini-services/pixel-mcp/` — MCP server (stdio JSON-RPC)
- `prisma/schema.prisma` — `PixelProject` model (SQLite, `db/custom.db`)
- Dev server: `bun run dev` (port 3000), logs in `dev.log`
- Never run `bun run build`; never hardcode ports in fetch URLs from the browser.
