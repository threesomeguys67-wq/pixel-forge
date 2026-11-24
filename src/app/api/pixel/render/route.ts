// POST /api/pixel/render — STATELESS one-shot render (no project is created)
//   body: { width?, height?, fps?, bg?, commands?: [...], format?: "png"|"gif",
//           scale?, frame?: 0|"sheet" }
//   Returns the image binary directly. Perfect for quick iteration.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSDoc } from '@/lib/pixel-server/sdoc';
import { applyCommands } from '@/lib/pixel-server/commands';
import { renderGIF, renderPNG } from '@/lib/pixel-server/render';
import { binaryResponse, errorResponse } from '@/lib/pixel-server/api';
import { RenderBody, zodMessage } from '@/lib/pixel-server/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const parsed = RenderBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: `invalid request body: ${zodMessage(parsed.error as z.ZodError)}` },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const doc = createSDoc(body.width, body.height, { fps: body.fps });
    if (body.bg !== undefined) {
      applyCommands(doc, [{ op: 'fillLayer', color: body.bg }]);
    }
    if (body.commands.length > 0) {
      applyCommands(doc, body.commands);
    }

    if (body.format === 'gif') {
      const gif = await renderGIF(doc, { scale: body.scale, bg: body.bg ?? 'transparent', fps: body.fps });
      return binaryResponse(gif.buffer, 'image/gif', 'pixelforge_render.gif');
    }
    const png = await renderPNG(doc, { scale: body.scale, bg: body.bg ?? 'transparent', frame: body.frame });
    return binaryResponse(png.buffer, 'image/png', 'pixelforge_render.png');
  } catch (e) {
    return errorResponse(e);
  }
}
