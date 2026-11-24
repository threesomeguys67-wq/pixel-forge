// GET /api/pixel/projects/[id]/pixels — read pixels as agent-readable text
//   ?frame=0   ?mode=grid|ascii|json   ?rect=x,y,w,h
//   grid:  rows of rrggbb hex ("." = transparent)
//   ascii: luminance preview (" .:-=+*#%@")
//   json:  2D array of "#rrggbb" | null

import { getSDoc } from '@/lib/pixel-server/projects';
import { renderPixelGrid } from '@/lib/pixel-server/render';
import { errorResponse, fail, ok } from '@/lib/pixel-server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);

    const frameRaw = Number(url.searchParams.get('frame') ?? '0');
    const frame = Number.isInteger(frameRaw) && frameRaw >= 0 ? frameRaw : 0;
    const modeRaw = url.searchParams.get('mode');
    const mode = modeRaw === 'ascii' || modeRaw === 'json' ? modeRaw : 'grid';

    let rect: { x: number; y: number; w: number; h: number } | undefined;
    const rectRaw = url.searchParams.get('rect');
    if (rectRaw) {
      const parts = rectRaw.split(',').map((n) => Number(n));
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        return fail(400, 'rect must be x,y,w,h (e.g. ?rect=0,0,16,16)');
      }
      rect = { x: Math.trunc(parts[0]), y: Math.trunc(parts[1]), w: Math.trunc(parts[2]), h: Math.trunc(parts[3]) };
    }

    const doc = await getSDoc(id);
    const result = renderPixelGrid(doc, { frame, mode, rect });
    return ok({
      frame,
      mode,
      width: result.width,
      height: result.height,
      rect: result.rect,
      text: result.text,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
