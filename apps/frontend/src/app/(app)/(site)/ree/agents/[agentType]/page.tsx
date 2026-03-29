'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  agentTypeFromSlug,
  slugFromAgentType,
} from '@gitroom/frontend/lib/ree/agents';
import { useReeClients } from '@gitroom/frontend/components/ree/hooks/use-ree-clients';
import { useReeClient } from '@gitroom/frontend/components/ree/hooks/use-ree-client';
import type { AgentType } from '@prisma/client';

type ChatMsg = { role: string; content: string; at?: string };

const COLORS: Record<AgentType, string> = {
  REE: '#E63946',
  AGUS: '#3498DB',
  NUMBER_PI: '#FF6B35',
  AGENT_007: '#00FF87',
  HIPPIE_VIRAL: '#9B59B6',
  PIXY: '#F1C40F',
};

function tryParseJson(text: string) {
  const t = text.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

export default function ReeAgentChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug =
    typeof params.agentType === 'string' ? params.agentType : '';
  const agentType = agentTypeFromSlug(slug);

  const { data: clients } = useReeClients();
  const clientList = Array.isArray(clients) ? clients : [];

  const initialClient = searchParams.get('clientId') || '';
  const [clientId, setClientId] = useState(initialClient);
  const { data: client, mutate: mutateClient } = useReeClient(
    clientId || undefined
  );

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('clientId');
    if (q) {
      setClientId(q);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!client || !agentType) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    const conv = (client as any).conversations?.find(
      (c: { agentType: string }) => c.agentType === agentType
    );
    if (conv) {
      setConversationId(conv.id);
      const m = Array.isArray(conv.messages) ? conv.messages : [];
      setMessages(m as ChatMsg[]);
    } else {
      setConversationId(null);
      setMessages([]);
    }
  }, [client, agentType]);

  const send = useCallback(async () => {
    if (!agentType || !clientId || !input.trim()) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/ree/api/agents', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          agentType,
          message: input.trim(),
          conversationId: conversationId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error');
      }
      setMessages(data.messages || []);
      setConversationId(data.conversationId);
      setInput('');
      await mutateClient();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentType, clientId, input, conversationId, mutateClient]);

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return messages[i].content;
      }
    }
    return '';
  }, [messages]);

  const saveBrief = useCallback(async () => {
    if (!clientId || !lastAssistant) {
      return;
    }
    const j = tryParseJson(lastAssistant);
    if (!j || typeof j !== 'object') {
      alert('No se encontró JSON de brief en el último mensaje del agente.');
      return;
    }
    const res = await fetch(`/ree/api/clients/${clientId}/brief`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(j),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await mutateClient();
    alert('Brief guardado');
  }, [clientId, lastAssistant, mutateClient]);

  const saveStrategy = useCallback(async () => {
    if (!clientId || !lastAssistant || !client?.briefs?.[0]?.id) {
      alert('Necesitás un brief primero.');
      return;
    }
    const j = tryParseJson(lastAssistant);
    if (!j || typeof j !== 'object') {
      alert('No se encontró JSON de estrategia.');
      return;
    }
    const res = await fetch(`/ree/api/clients/${clientId}/strategy`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...j, briefId: client.briefs[0].id }),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await mutateClient();
    alert('Estrategia guardada');
  }, [clientId, lastAssistant, client, mutateClient]);

  const saveScript = useCallback(async () => {
    if (!clientId || !lastAssistant) {
      return;
    }
    const j = tryParseJson(lastAssistant);
    if (!j || typeof j !== 'object') {
      alert('No se encontró JSON de guión.');
      return;
    }
    const res = await fetch(`/ree/api/clients/${clientId}/scripts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...j,
        strategyId: client?.strategies?.[0]?.id,
      }),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await mutateClient();
    alert('Guión guardado');
  }, [clientId, lastAssistant, client, mutateClient]);

  if (!agentType) {
    return (
      <div className="p-8 text-white">
        Agente no válido.{' '}
        <Link href="/ree" className="text-[var(--ree-accent)]">
          Volver
        </Link>
      </div>
    );
  }

  const accent = COLORS[agentType];
  const darkHeader = agentType === 'AGENT_007' || agentType === 'PIXY';

  return (
    <div className="min-h-full flex flex-col max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/ree" className="text-sm text-[var(--ree-muted)]">
          ← Hub
        </Link>
      </div>
      <header
        className="rounded-xl px-4 py-3 mb-4 font-bold text-lg"
        style={{
          backgroundColor: accent,
          color: darkHeader ? '#0a0a0a' : '#fff',
        }}
      >
        {agentType.replace(/_/g, ' ')} · /ree/agents/{slugFromAgentType(agentType)}
      </header>

      <label className="text-sm text-[var(--ree-muted)] mb-2 block">
        Cliente
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-1 w-full rounded-lg bg-[var(--ree-card)] border border-[var(--ree-border)] text-white px-3 py-2"
        >
          <option value="">Elegir…</option>
          {clientList.map((c: { id: string; name: string; company?: string }) => (
            <option key={c.id} value={c.id}>
              {c.company || c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex-1 min-h-[320px] rounded-xl border border-[var(--ree-border)] bg-[var(--ree-card)] p-3 overflow-y-auto mb-3 flex flex-col gap-2">
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                isUser ? 'self-end bg-[#2a2a2a] text-white' : 'self-start'
              }`}
              style={
                !isUser
                  ? {
                      backgroundColor: `${accent}33`,
                      borderLeft: `3px solid ${accent}`,
                      color: '#fff',
                    }
                  : undefined
              }
            >
              {m.content}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {agentType === 'AGUS' && (
          <button
            type="button"
            onClick={() => saveBrief().catch(alert)}
            className="px-3 py-1 rounded-md text-sm bg-[var(--ree-accent)] text-white"
          >
            GUARDAR BRIEF
          </button>
        )}
        {agentType === 'NUMBER_PI' && (
          <button
            type="button"
            onClick={() => saveStrategy().catch(alert)}
            className="px-3 py-1 rounded-md text-sm bg-[var(--ree-accent)] text-white"
          >
            GUARDAR ESTRATEGIA
          </button>
        )}
        {agentType === 'HIPPIE_VIRAL' && (
          <button
            type="button"
            onClick={() => saveScript().catch(alert)}
            className="px-3 py-1 rounded-md text-sm bg-[var(--ree-accent)] text-white"
          >
            GUARDAR GUIÓN
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escribí tu mensaje…"
          className="flex-1 rounded-lg bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white text-sm"
        />
        <button
          type="button"
          disabled={loading || !clientId}
          onClick={() => send()}
          className="px-4 py-2 rounded-lg font-semibold text-white bg-[var(--ree-accent)] disabled:opacity-40"
        >
          ENVIAR
        </button>
      </div>
    </div>
  );
}
