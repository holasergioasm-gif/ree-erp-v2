// @ts-nocheck
import { NextResponse } from 'next/server';
import { reePrisma } from '@gitroom/frontend/lib/ree-prisma';
import { assertReeAuth } from '@gitroom/frontend/lib/ree-auth-server';
import { ContractType } from '@prisma/client';

export const dynamic = 'force-dynamic';

function parseJsonArray(val: unknown, field: string): unknown[] {
  if (Array.isArray(val) && val.length > 0) {
    return val;
  }
  throw new Error(`${field} must be a non-empty array`);
}

export async function GET() {
  const auth = await assertReeAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const clients = await reePrisma.reeClient.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { scripts: true } },
      conversations: {
        select: { agentType: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const auth = await assertReeAuth();
  if (!auth.ok) {
    return auth.response;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const contractType = body.contractType as string | undefined;
  const paymentCurrency =
    typeof body.paymentCurrency === 'string'
      ? body.paymentCurrency.trim()
      : '';
  const paymentAmount = body.paymentAmount;

  const errors: string[] = [];
  if (!name) {
    errors.push('name is required');
  }
  if (!email) {
    errors.push('email is required');
  }
  if (!contractType || !Object.values(ContractType).includes(contractType as ContractType)) {
    errors.push('contractType must be MONTHLY or MODULAR');
  }

  let platforms: unknown[] = [];
  let deliverables: unknown[] = [];
  try {
    platforms = parseJsonArray(body.platforms, 'platforms');
  } catch (e) {
    errors.push((e as Error).message);
  }
  try {
    deliverables = parseJsonArray(body.deliverables, 'deliverables');
  } catch (e) {
    errors.push((e as Error).message);
  }

  if (paymentAmount === undefined || paymentAmount === null) {
    errors.push('paymentAmount is required');
  } else if (typeof paymentAmount !== 'number' || Number.isNaN(paymentAmount)) {
    errors.push('paymentAmount must be a number');
  }

  if (!paymentCurrency) {
    errors.push('paymentCurrency is required');
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  try {
    const client = await reePrisma.reeClient.create({
      data: {
        name,
        email,
        contractType: contractType as ContractType,
        platforms,
        deliverables,
        paymentAmount: paymentAmount as number,
        paymentCurrency,
        company: typeof body.company === 'string' ? body.company : undefined,
        industry: typeof body.industry === 'string' ? body.industry : undefined,
        billingType:
          typeof body.billingType === 'string' ? body.billingType : undefined,
        contextNotes:
          typeof body.contextNotes === 'string' ? body.contextNotes : undefined,
        documents: Array.isArray(body.documents) ? body.documents : undefined,
      },
    });
    return NextResponse.json(client);
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'code' in e && e.code === 'P2002'
      ? 'A client with this email already exists'
      : 'Could not create client';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
