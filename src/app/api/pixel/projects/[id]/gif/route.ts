// GET /api/pixel/projects/[id]/gif — render all frames as a looping GIF
//   ?scale=1..16   &bg=transparent|white|black|#hex

import { getSDoc } from '@/lib/pixel-server/projects';
import { renderGIF } from '@/lib/pixel-server/render';
import { binaryResponse, errorResponse } from '@/lib/pixel-server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const scaleRaw = url.searchParams.get('scale');
    const scale = scaleRaw !== null ? Math.max(1, Math.min(16, Math.round(Number(scaleRaw)))) : 1;
    const bg = url.searchParams.get('bg') ?? 'transparent';

    const doc = await getSDoc(id);
    const gif = await renderGIF(doc, { scale, bg });
    return binaryResponse(
      gif.buffer,
      'image/gif',
      `pixelforge_${doc.width}x${doc.height}_${doc.frames.length}f.gif`,
      { 'X-Pixel-Project-Id': id }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
