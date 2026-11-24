// GET  /api/pixel/projects        — list the project library
// POST /api/pixel/projects        — create a project (optionally run commands)
//                                   ?png=1&scale=N&frame=F  -> respond with PNG directly

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PALETTES } from '@/components/pixel/presets';
import { assertSerializedProject, createSDoc, sdocFromSerialized } from '@/lib/pixel-server/sdoc';
import { applyCommands } from '@/lib/pixel-server/commands';
import { renderPNG } from '@/lib/pixel-server/render';
import { createProject, listProjects } from '@/lib/pixel-server/projects';
import { binaryResponse, errorResponse, ok, renderQuery } from '@/lib/pixel-server/api';
import { CreateBody, zodMessage } from '@/lib/pixel-server/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await listProjects();
    return ok({
      projects: projects.map((p) => ({
        ...p,
        urls: {
          png: `/api/pixel/projects/${p.id}/png?scale=1&frame=0`,
          gif: `/api/pixel/projects/${p.id}/gif`,
          json: `/api/pixel/projects/${p.id}`,
          commands: `/api/pixel/projects/${p.id}/commands`,
          pixels: `/api/pixel/projects/${p.id}/pixels`,
        },
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = CreateBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: `invalid request body: ${zodMessage(parsed.error as z.ZodError)}` },
        { status: 400 }
      );
    }
    const body = parsed.data;

    let paletteColors: string[] | undefined;
    if (body.palette !== undefined) {
      const preset = PALETTES.find((p) => p.name.toLowerCase() === body.palette!.toLowerCase());
      if (!preset) {
        return NextResponse.json(
          {
            ok: false,
            error: `unknown palette "${body.palette}" — available: ${PALETTES.map((p) => p.name).join(', ')}`,
          },
          { status: 400 }
        );
      }
      paletteColors = preset.colors;
    }

    let summaries: string[] = [];
    let doc;
    if (body.project !== undefined) {
      // full-project save from the web editor
      assertSerializedProject(body.project);
      doc = await sdocFromSerialized(body.project);
      if (body.commands && body.commands.length > 0) {
        applyCommands(doc, body.commands);
      }
    } else {
      doc = createSDoc(body.width, body.height, { fps: body.fps });
      if (body.bg !== undefined) {
        applyCommands(doc, [{ op: 'fillLayer', color: body.bg }]);
      }
      if (body.commands && body.commands.length > 0) {
        const res = applyCommands(doc, body.commands);
        summaries = res.summaries;
      }
    }

    const { meta } = await createProject(
      { name: body.name, width: doc.width, height: doc.height, fps: doc.fps },
      doc
    );

    const url = new URL(req.url);
    if (url.searchParams.get('png') === '1') {
      const { scale, bg, frame } = renderQuery(url);
      const png = await renderPNG(doc, { scale, bg, frame });
      return binaryResponse(png.buffer, 'image/png', `${meta.name.replace(/\s+/g, '_')}.png`, {
        'X-Pixel-Project-Id': meta.id,
      });
    }

    return ok(
      {
        project: {
          ...meta,
          urls: {
            png: `/api/pixel/projects/${meta.id}/png?scale=1&frame=0`,
            gif: `/api/pixel/projects/${meta.id}/gif`,
            json: `/api/pixel/projects/${meta.id}`,
            commands: `/api/pixel/projects/${meta.id}/commands`,
            pixels: `/api/pixel/projects/${meta.id}/pixels`,
          },
        },
        palette: paletteColors,
        applied: summaries.length,
        summaries,
      },
      { status: 201 }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
