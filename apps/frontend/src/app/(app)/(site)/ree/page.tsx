// @ts-nocheck
'use client';

import Link from 'next/link';
import { slugFromAgentType } from '@gitroom/frontend/lib/ree/agents';
import { useReeClients } from '@gitroom/frontend/components/ree/hooks/use-ree-clients';
import type { AgentType } from '@prisma/client';

const AGENTS: {
  type: AgentType;
  role: string;
  desc: string;
  color: string;
}[] = [
  {
    type: 'REE',
    role: 'Orquestador Master',
    desc: 'Visión 360 del cliente y coordinación de agentes.',
    color: '#E63946',
  },
  {
    type: 'AGUS',
    role: 'Brief Intake',
    desc: 'Onboarding y brief estructurado con la voz de la marca.',
    color: '#3498DB',
  },
  {
    type: 'NUMBER_PI',
    role: 'Estratega CMO',
    desc: 'Insight, claim, pilares y plan de contenido.',
    color: '#FF6B35',
  },
  {
    type: 'AGENT_007',
    role: 'Researcher',
    desc: 'Competencia, tendencias y referencias del nicho.',
    color: '#00FF87',
  },
  {
    type: 'HIPPIE_VIRAL',
    role: 'Guionista',
    desc: 'Scripts A/B para Reels, TikTok y Shorts.',
    color: '#9B59B6',
  },
  {
    type: 'PIXY',
    role: 'Analytics',
    desc: 'Diagnóstico mensual y próximos pasos data-driven.',
    color: '#F1C40F',
  },
];

function displayName(type: AgentType) {
  if (type === 'NUMBER_PI') {
    return 'NUMBER PI';
  }
  if (type === 'AGENT_007') {
    return '007';
  }
  if (type === 'HIPPIE_VIRAL') {
    return 'HIPPIE VIRAL';
  }
  return type;
}

export default function ReeHubPage() {
  const { data: clients } = useReeClients();
  const list = Array.isArray(clients) ? clients : [];
  const total = list.length;
  const inPipeline = list.filter((c) => c.pipelineStage !== 'EVALUACION').length;
  const scriptsTotal = list.reduce(
    (acc, c) => acc + (c._count?.scripts ?? 0),
    0
  );

  return (
    <div className="min-h-full px-6 py-10 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1
          className="text-4xl md:text-5xl font-bold tracking-tight mb-2"
          style={{ color: 'var(--ree-accent)' }}
        >
          [ REE AGENTES ]
        </h1>
        <p className="text-lg text-[var(--ree-muted)]">
          Sistema de agentes creativos para Ree Agencia
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENTS.map((a) => {
          const slug = slugFromAgentType(a.type);
          return (
            <Link
              key={a.type}
              href={`/ree/agents/${slug}`}
              className="block rounded-xl border border-[var(--ree-border)] bg-[var(--ree-card)] p-5 transition hover:opacity-95 hover:border-[var(--ree-accent)]"
            >
              <div
                className="text-xl font-bold mb-1"
                style={{ color: a.color }}
              >
                {displayName(a.type)}
              </div>
              <div className="text-sm font-semibold mb-2 text-[var(--ree-muted)]">
                {a.role}
              </div>
              <p className="text-sm leading-relaxed text-[var(--ree-muted)]">
                {a.desc}
              </p>
            </Link>
          );
        })}
      </div>

      <footer className="mt-12 pt-8 border-t border-[var(--ree-border)] flex flex-wrap gap-8 text-sm">
        <div>
          <div className="text-[var(--ree-muted)]">Clientes REE</div>
          <div className="text-2xl font-bold text-white">{total}</div>
        </div>
        <div>
          <div className="text-[var(--ree-muted)]">En pipeline</div>
          <div className="text-2xl font-bold text-white">{inPipeline}</div>
        </div>
        <div>
          <div className="text-[var(--ree-muted)]">Guiones generados</div>
          <div className="text-2xl font-bold text-white">{scriptsTotal}</div>
        </div>
      </footer>
    </div>
  );
}
