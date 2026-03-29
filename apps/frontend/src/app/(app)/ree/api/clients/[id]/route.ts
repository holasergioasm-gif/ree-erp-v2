// @ts-nocheck
import { NextResponse } from 'next/server';
import { reePrisma } from '@gitroom/frontend/lib/ree-prisma';
import {
  assertReeAuth,
  assertReeAdmin,
} from '@gitroom/frontend/lib/ree-auth-server';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await assertReeAuth();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;

  const client = await reePrisma.reeClient.findUnique({
    where: { id },
    include: {
      conversations: { orderBy: { updatedAt: 'desc' } },
      briefs: { orderBy: { createdAt: 'desc' } },
      strategies: { orderBy: { createdAt: 'desc' } },
      scripts: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(client);
}

const PATCHABLE = new Set([
  'name',
  'email',
  'company',
  'industry',
  'contractType',
  'status',
  'pipelineStage',
  'paymentStatus',
  'paymentAmount',
  'paymentCurrency',
  'billingType',
  'platforms',
  'deliverables',
  'documents',
  'contextNotes',
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await assertReeAuth();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;

  const existing = await reePrisma.reeClient.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data: Prisma.ReeClientUpdateInput = {};

  for (const key of PATCHABLE) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      (data as Record<string, unknown>)[key] = body[key];
    }
  }

  if (body.pipelineStage && body.pipelineStage !== existing.pipelineStage) {
    data.stageUpdatedAt = new Date();
    const prev = existing.stageHistory as unknown[];
    const list = Array.isArray(prev) ? [...prev] : [];
    list.push({
      stage: body.pipelineStage,
      at: new Date().toISOString(),
    });
    data.stageHistory = list as Prisma.InputJsonValue;
  }

  try {
    const updated = await reePrisma.reeClient.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'Could not update client' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await assertReeAdmin();
  if (!admin.ok) {
    return admin.response;
  }
  const { id } = await context.params;

  const existing = await reePrisma.reeClient.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await reePrisma.reeClient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
