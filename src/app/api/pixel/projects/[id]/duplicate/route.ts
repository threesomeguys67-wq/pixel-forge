// POST /api/pixel/projects/[id]/duplicate — copy a project
//   body: { "name"?: string }

import { duplicateProject } from '@/lib/pixel-server/projects';
import { errorResponse, ok } from '@/lib/pixel-server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    let name: string | undefined;
    try {
      const body = (await req.json()) as { name?: unknown };
      if (typeof body?.name === 'string' && body.name.trim() !== '') name = body.name.trim().slice(0, 80);
    } catch {
      /* empty body is fine */
    }
    const meta = await duplicateProject(id, name);
    return ok({ project: meta }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
