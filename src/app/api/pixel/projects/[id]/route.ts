// GET    /api/pixel/projects/[id]  — full project JSON (.pxforge.json format)
//                                     ?format=summary -> metadata only
// PUT    /api/pixel/projects/[id]  — replace content (web editor "save to library")
// PATCH  /api/pixel/projects/[id]  — rename
// DELETE /api/pixel/projects/[id]  — delete

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSerializedProject } from '@/lib/pixel-server/sdoc';
import {
  deleteProject,
  getProjectRow,
  getSDoc,
  getSerialized,
  replaceProject,
  renameProject,
} from '@/lib/pixel-server/projects';
import { errorResponse, fail, ok } from '@/lib/pixel-server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const row = await getProjectRow(id);
    if (url.searchParams.get('format') === 'summary') {
      const doc = await getSDoc(id);
      return ok({
        project: {
          id: row.id,
          name: row.name,
          width: doc.width,
          height: doc.height,
          fps: doc.fps,
          frameCount: doc.frames.length,
          layerCount: doc.layers.length,
          layers: doc.layers.map((l, i) => ({
            index: i,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            blend: l.blend,
            locked: l.locked,
            alphaLock: l.alphaLock,
          })),
          activeLayer: doc.activeLayer,
          activeFrame: doc.activeFrame,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      });
    }
    const { meta, project } = await getSerialized(id);
    return ok({ project: meta, data: project });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as { name?: unknown; project?: unknown };
    if (body.project === undefined || body.project === null) {
      return fail(400, 'PUT body must be { "name"?: string, "project": SerializedProject }');
    }
    try {
      assertSerializedProject(body.project);
    } catch (err) {
      return fail(400, err instanceof Error ? err.message : String(err));
    }
    let name: string | undefined;
    if (typeof body.name === 'string' && body.name.trim() !== '') {
      name = body.name.trim().slice(0, 80);
    }
    const meta = await replaceProject(id, body.project, name);
    return ok({ project: meta });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const parsed = z.object({ name: z.string().min(1).max(80) }).safeParse(await req.json());
    if (!parsed.success) return fail(400, 'PATCH body must be { "name": string }');
    const meta = await renameProject(id, parsed.data.name);
    return ok({ project: meta });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await deleteProject(id);
    return ok({ deleted: id });
  } catch (e) {
    return errorResponse(e);
  }
}
