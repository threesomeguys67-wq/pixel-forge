// GET /api/pixel/palettes — built-in color palettes for agents to pick from

import { PALETTES } from '@/components/pixel/presets';
import { ok } from '@/lib/pixel-server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return ok({
    palettes: PALETTES.map((p) => ({ name: p.name, size: p.colors.length, colors: p.colors })),
  });
}
