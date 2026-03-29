// @ts-nocheck
'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useReeClients } from '@gitroom/frontend/components/ree/hooks/use-ree-clients';
import {
  PIPELINE_STAGES,
  pipelineStageColor,
} from '@gitroom/frontend/lib/ree/pipeline';
import type { AgentType, PipelineStage } from '@prisma/client';

function daysInStage(stageUpdatedAt: string) {
  const t = new Date(stageUpdatedAt).getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export default function ReePipelinePage() {
  const { data: clients, mutate } = useReeClients();
  const list = Array.isArray(clients) ? clients : [];
  const [dragId, setDragId] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const m = new Map<PipelineStage, typeof list>();
    for (const s of PIPELINE_STAGES) {
      m.set(s.id, []);
    }
    for (const c of list) {
      const arr = m.get(c.pipelineStage) || [];
      arr.push(c);
      m.set(c.pipelineStage, arr);
    }
    return m;
  }, [list]);

  const move = useCallback(
    async (clientId: string, stage: PipelineStage) => {
      const res = await fetch(`/ree/api/clients/${clientId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: stage }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await mutate();
    },
    [mutate]
  );

  return (
    <div className="min-h-full px-4 py-6 overflow-x-auto">
      <div className="mb-6 flex items-center justify-between max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ree-accent)' }}>
          Pipeline REE
        </h1>
        <Link href="/ree/clients" className="text-sm text-[var(--ree-muted)]">
          Clientes
        </Link>
      </div>
      <div className="flex gap-3 min-w-max pb-4 max-w-[1600px] mx-auto">
        {PIPELINE_STAGES.map((col) => {
          const cards = byStage.get(col.id) || [];
          return (
            <div
              key={col.id}
              className="w-[220px] shrink-0 rounded-xl border border-[var(--ree-border)] bg-[#0d0d0d] flex flex-col max-h-[calc(100vh-140px)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/clientId') || dragId;
                if (id) {
                  move(id, col.id).catch(alert);
                }
                setDragId(null);
              }}
            >
              <div
                className="px-3 py-2 border-b border-[var(--ree-border)] font-semibold text-sm text-white shrink-0"
                style={{ borderTopColor: pipelineStageColor(col.id) }}
              >
                {col.label}{' '}
                <span className="text-[var(--ree-muted)]">({cards.length})</span>
              </div>
              <div className="p-2 flex flex-col gap-2 overflow-y-auto flex-1">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/clientId', c.id);
                      setDragId(c.id);
                    }}
                    className="rounded-lg border border-[var(--ree-border)] bg-[var(--ree-card)] p-2 cursor-grab active:cursor-grabbing"
                  >
                    <Link
                      href={`/ree/clients/${c.id}`}
                      className="font-medium text-white text-sm hover:underline"
                    >
                      {c.company || c.name}
                    </Link>
                    <div className="text-xs text-[var(--ree-muted)] mt-1">
                      {daysInStage(c.stageUpdatedAt)} días en etapa
                    </div>
                    <ActiveAgentLabel conversations={c.conversations} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveAgentLabel(props: {
  conversations?: { agentType: AgentType; updatedAt: string }[];
}) {
  const convs = props.conversations || [];
  if (!convs.length) {
    return (
      <div className="text-[10px] text-[var(--ree-muted)] mt-1">
        Agente: —
      </div>
    );
  }
  const sorted = [...convs].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const top = sorted[0];
  return (
    <div className="text-[10px] text-[var(--ree-muted)] mt-1">
      Último agente: {top.agentType.replace(/_/g, ' ')}
    </div>
  );
}
