import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentType } from '@prisma/client';
import { reePrisma } from '@gitroom/frontend/lib/ree-prisma';
import { assertReeAuth } from '@gitroom/frontend/lib/ree-auth-server';
import { AGENT_SYSTEM_PROMPTS } from '@gitroom/frontend/lib/ree/agents';

export const dynamic = 'force-dynamic';

type ChatMsg = { role: 'user' | 'assistant'; content: string; at?: string };

function toAnthropicMessages(msgs: ChatMsg[]) {
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of msgs) {
    if (m.role !== 'user' && m.role !== 'assistant') {
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  while (out.length > 0 && out[0].role !== 'user') {
    out.shift();
  }
  return out;
}

const AGENT_TYPES = new Set<string>([
  'REE',
  'AGUS',
  'NUMBER_PI',
  'AGENT_007',
  'HIPPIE_VIRAL',
  'PIXY',
]);

export async function POST(request: Request) {
  const auth = await assertReeAuth();
  if (!auth.ok) {
    return auth.response;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured' },
      { status: 503 }
    );
  }

  let body: {
    clientId?: string;
    agentType?: string;
    message?: string;
    conversationId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, agentType, message, conversationId } = body;
  if (!clientId || typeof clientId !== 'string') {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }
  if (!agentType || !AGENT_TYPES.has(agentType)) {
    return NextResponse.json({ error: 'Invalid agentType' }, { status: 400 });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const client = await reePrisma.reeClient.findUnique({
    where: { id: clientId },
  });
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const type = agentType as AgentType;
  let conv = conversationId
    ? await reePrisma.agentConversation.findFirst({
        where: { id: conversationId, clientId, agentType: type },
      })
    : null;

  if (!conv) {
    conv = await reePrisma.agentConversation.create({
      data: {
        clientId,
        agentType: type,
        messages: [],
      },
    });
  }

  const prior = (Array.isArray(conv.messages) ? conv.messages : []) as ChatMsg[];
  const userEntry: ChatMsg = {
    role: 'user',
    content: message.trim(),
    at: new Date().toISOString(),
  };
  const withUser = [...prior, userEntry];

  await reePrisma.agentConversation.update({
    where: { id: conv.id },
    data: { messages: withUser as object[] },
  });

  const system = AGENT_SYSTEM_PROMPTS[type];
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model =
    process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  const apiMessages = toAnthropicMessages(withUser);

  let assistantText = '';
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system,
      messages: apiMessages,
    });
    const block = response.content[0];
    assistantText =
      block && block.type === 'text' ? block.text : '';
  } catch (e: unknown) {
    const errMsg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : 'Anthropic request failed';
    return NextResponse.json({ error: errMsg }, { status: 502 });
  }

  const assistantEntry: ChatMsg = {
    role: 'assistant',
    content: assistantText,
    at: new Date().toISOString(),
  };
  const finalMessages = [...withUser, assistantEntry];

  await reePrisma.agentConversation.update({
    where: { id: conv.id },
    data: { messages: finalMessages as object[] },
  });

  return NextResponse.json({
    conversationId: conv.id,
    response: assistantText,
    messages: finalMessages,
  });
}
