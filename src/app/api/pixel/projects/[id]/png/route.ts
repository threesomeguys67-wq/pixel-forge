// GET /api/pixel/projects/[id]/png — render a frame (or sprite sheet) as PNG
//   ?scale=1..16   &frame=0|sheet   &bg=transparent|white|black|#hex
//   (no ?scale -> preview scale that fits ~160px on the long side, for <img>)

import { getSDoc } from '@/lib/pixel-server/projects';
import { renderPNG } from '@/lib/pixel-server/render';
import { binaryResponse, errorResponse, renderQuery } from '@/lib/pixel-server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const { bg, frame } = renderQuery(url);

    const doc = await getSDoc(id);
    let { scale } = renderQuery(url);
    if (url.searchParams.get('scale') === null) {
      const long = Math.max(doc.width, doc.height);
      scale = Math.max(1, Math.min(8, Math.round(160 / Math.max(1, long))));
    }

    const png = await renderPNG(doc, { scale, bg, frame });
    return binaryResponse(
      png.buffer,
      'image/png',
      `pixelforge_${doc.width}x${doc.height}.png`,
      { 'X-Pixel-Project-Id': id }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
