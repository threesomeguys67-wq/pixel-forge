// POST /api/pixel/projects/[id]/commands — apply a command batch to a project
//   body: { "commands": [ { "op": "...", ... }, ... ] }
//   ?png=1&scale=N&frame=F&bg=...  -> respond with the rendered PNG directly

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyCommands } from '@/lib/pixel-server/commands';
import { renderPNG } from '@/lib/pixel-server/render';
import { getSDoc, saveSDoc } from '@/lib/pixel-server/projects';
import { binaryResponse, errorResponse, fail, ok, renderQuery } from '@/lib/pixel-server/api';
import { CommandsBody, zodMessage } from '@/lib/pixel-server/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const parsed = CommandsBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: `invalid commands: ${zodMessage(parsed.error as z.ZodError)}` },
        { status: 400 }
      );
    }

    const doc = await getSDoc(id);
    const result = applyCommands(doc, parsed.data.commands);
    const meta = await saveSDoc(id, doc);

    const url = new URL(req.url);
    if (url.searchParams.get('png') === '1') {
      const { scale, bg, frame } = renderQuery(url);
      const png = await renderPNG(doc, { scale, bg, frame });
      return binaryResponse(png.buffer, 'image/png', `${meta.name.replace(/\s+/g, '_')}.png`, {
        'X-Pixel-Project-Id': meta.id,
      });
    }

    return ok({
      project: meta,
      applied: result.applied,
      summaries: result.summaries,
      urls: {
        png: `/api/pixel/projects/${meta.id}/png?scale=1&frame=0`,
        gif: `/api/pixel/projects/${meta.id}/gif`,
        json: `/api/pixel/projects/${meta.id}`,
        pixels: `/api/pixel/projects/${meta.id}/pixels`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET(_req: Request, _ctx: Ctx) {
  return fail(405, 'use POST with { "commands": [...] } — see AGENTS.md for the command reference');
}
