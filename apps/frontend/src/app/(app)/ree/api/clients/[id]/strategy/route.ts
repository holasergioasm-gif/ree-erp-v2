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

  const briefId = typeof body.briefId === 'string' ? body.briefId : '';
  if (!briefId) {
    return NextResponse.json({ error: 'briefId is required' }, { status: 400 });
  }

  const brief = await reePrisma.clientBrief.findFirst({
    where: { id: briefId, clientId },
  });
  if (!brief) {
    return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
  }

  const existing = await reePrisma.clientStrategy.findUnique({
    where: { briefId },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Strategy already exists for this brief' },
      { status: 400 }
    );
  }

  const strategy = await reePrisma.clientStrategy.create({
    data: {
      clientId,
      briefId,
      insight: typeof body.insight === 'string' ? body.insight : undefined,
      claim: typeof body.claim === 'string' ? body.claim : undefined,
      slogan: typeof body.slogan === 'string' ? body.slogan : undefined,
      pillars: Array.isArray(body.pillars) ? body.pillars : [],
      monthlyGoal:
        typeof body.monthlyGoal === 'string' ? body.monthlyGoal : undefined,
      toneOfVoice:
        typeof body.toneOfVoice === 'string' ? body.toneOfVoice : undefined,
      research:
        body.research && typeof body.research === 'object'
          ? (body.research as object)
          : {},
    },
  });

  return NextResponse.json(strategy);
}
