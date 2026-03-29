import { NextResponse } from 'next/server';
import { reePrisma } from '@gitroom/frontend/lib/ree-prisma';
import { assertReeAuth } from '@gitroom/frontend/lib/ree-auth-server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await assertReeAuth();
  if (!auth.ok) {
    return auth.response;
  }
  const { id: clientId } = await context.params;

  const client = await reePrisma.reeClient.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const platform = typeof body.platform === 'string' ? body.platform.trim() : '';
  const format = typeof body.format === 'string' ? body.format.trim() : '';
  if (!platform || !format) {
    return NextResponse.json(
      { error: 'platform and format are required' },
      { status: 400 }
    );
  }

  const strategyId =
    typeof body.strategyId === 'string' && body.strategyId
      ? body.strategyId
      : undefined;
  if (strategyId) {
    const st = await reePrisma.clientStrategy.findFirst({
      where: { id: strategyId, clientId },
    });
    if (!st) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }
  }

  const script = await reePrisma.contentScript.create({
    data: {
      clientId,
      strategyId,
      platform,
      format,
      versionA: typeof body.versionA === 'string' ? body.versionA : undefined,
      versionB: typeof body.versionB === 'string' ? body.versionB : undefined,
      hook: typeof body.hook === 'string' ? body.hook : undefined,
      cta: typeof body.cta === 'string' ? body.cta : undefined,
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
    },
  });

  return NextResponse.json(script);
}
