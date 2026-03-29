// @ts-nocheck
import { NextResponse } from 'next/server';
import { reePrisma } from '@gitroom/frontend/lib/ree-prisma';
import { assertReeAuth } from '@gitroom/frontend/lib/ree-auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await assertReeAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const [totalClients, inPipeline, scriptsTotal] = await Promise.all([
    reePrisma.reeClient.count(),
    reePrisma.reeClient.count({
      where: { pipelineStage: { not: 'EVALUACION' } },
    }),
    reePrisma.contentScript.count(),
  ]);

  return NextResponse.json({
    totalClients,
    inPipeline,
    scriptsTotal,
  });
}

