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

  const brief = await reePrisma.clientBrief.create({
    data: {
      clientId,
      rawTranscript:
        typeof body.rawTranscript === 'string' ? body.rawTranscript : undefined,
      brandName: typeof body.brandName === 'string' ? body.brandName : undefined,
      brandVoice: typeof body.brandVoice === 'string' ? body.brandVoice : undefined,
      targetAudience:
        typeof body.targetAudience === 'string' ? body.targetAudience : undefined,
      mainProduct:
        typeof body.mainProduct === 'string' ? body.mainProduct : undefined,
      competitors: Array.isArray(body.competitors) ? body.competitors : [],
      goals: Array.isArray(body.goals) ? body.goals : [],
      contentTypes: Array.isArray(body.contentTypes) ? body.contentTypes : [],
    },
  });

  return NextResponse.json(brief);
}
