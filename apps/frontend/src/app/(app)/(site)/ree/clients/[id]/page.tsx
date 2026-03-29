'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useReeClient } from '@gitroom/frontend/components/ree/hooks/use-ree-client';
import {
  PIPELINE_STAGES,
  pipelineStageColor,
} from '@gitroom/frontend/lib/ree/pipeline';
import { slugFromAgentType } from '@gitroom/frontend/lib/ree/agents';
import type { AgentType, PaymentStatus } from '@prisma/client';

const AGENT_ORDER: AgentType[] = [
  'REE',
  'AGUS',
  'NUMBER_PI',
  'AGENT_007',
  'HIPPIE_VIRAL',
  'PIXY',
];

const TAB_IDS = [
  'info',
  'pipeline',
  'agents',
  'brief',
  'strategy',
  'scripts',
  'docs',
  'billing',
] as const;

type TabId = (typeof TAB_IDS)[number];

export default function ReeClientDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const { data: client, mutate } = useReeClient(id);
  const [tab, setTab] = useState<TabId>('info');

  const platforms = useMemo(() => {
    if (!client?.platforms || !Array.isArray(client.platforms)) {
      return [];
    }
    return client.platforms as string[];
  }, [client]);

  const deliverables = useMemo(() => {
    if (!client?.deliverables || !Array.isArray(client.deliverables)) {
      return [];
    }
    return client.deliverables as string[];
  }, [client]);

  const documents = useMemo(() => {
    if (!client?.documents || !Array.isArray(client.documents)) {
      return [];
    }
    return client.documents as string[];
  }, [client]);

  const patch = useCallback(
    async (body: object) => {
      if (!id) {
        return;
      }
      const res = await fetch(`/ree/api/clients/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await mutate();
    },
    [id, mutate]
  );

  if (!id) {
    return null;
  }
  if (!client) {
    return (
      <div className="p-8 text-[var(--ree-muted)]">Cargando…</div>
    );
  }

  const latestBrief = client.briefs?.[0];
  const latestStrategy = client.strategies?.[0];

  return (
    <div className="min-h-full px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/ree/clients"
          className="text-sm text-[var(--ree-muted)] hover:text-white"
        >
          ← Clientes
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">
          {client.company || client.name}
        </h1>
        <p className="text-[var(--ree-muted)]">{client.email}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-[var(--ree-border)] pb-2">
        {TAB_IDS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
              tab === t
                ? 'bg-[var(--ree-accent)] text-white'
                : 'text-[var(--ree-muted)] hover:text-white'
            }`}
          >
            [{t}]
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <section className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre" value={client.name} />
            <Field label="Estado" value={client.status} />
            <Field label="Industria" value={client.industry || '—'} />
            <Field label="Contrato" value={client.contractType} />
          </div>
          <div>
            <div className="text-[var(--ree-muted)] mb-1">Plataformas</div>
            <div className="text-white">{platforms.join(', ') || '—'}</div>
          </div>
          <div>
            <div className="text-[var(--ree-muted)] mb-1">Entregables</div>
            <div className="text-white">{deliverables.join(', ') || '—'}</div>
          </div>
          <div>
            <div className="text-[var(--ree-muted)] mb-1">Notas</div>
            <p className="text-white whitespace-pre-wrap">
              {client.contextNotes || '—'}
            </p>
          </div>
        </section>
      )}

      {tab === 'pipeline' && (
        <section>
          <div className="flex flex-col gap-3">
            {PIPELINE_STAGES.map((s, i) => {
              const active = client.pipelineStage === s.id;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: active
                        ? 'var(--ree-accent)'
                        : 'var(--ree-card)',
                      color: active ? '#fff' : pipelineStageColor(s.id),
                      border: `2px solid ${pipelineStageColor(s.id)}`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className={`flex-1 rounded-lg border px-4 py-3 ${
                      active
                        ? 'border-[var(--ree-accent)] bg-[#1a1010]'
                        : 'border-[var(--ree-border)] bg-[var(--ree-card)]'
                    }`}
                  >
                    <div className="font-semibold text-white">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'agents' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AGENT_ORDER.map((a) => (
            <Link
              key={a}
              href={`/ree/agents/${slugFromAgentType(a)}?clientId=${client.id}`}
              className="block rounded-lg border border-[var(--ree-border)] bg-[var(--ree-card)] px-4 py-3 text-white hover:border-[var(--ree-accent)]"
            >
              Abrir {a.replace(/_/g, ' ')}
            </Link>
          ))}
        </section>
      )}

      {tab === 'brief' && (
        <section className="text-sm space-y-2 text-white">
          {!latestBrief ? (
            <p className="text-[var(--ree-muted)]">Todavía no hay brief.</p>
          ) : (
            <>
              <pre className="whitespace-pre-wrap bg-[var(--ree-card)] border border-[var(--ree-border)] rounded-lg p-4 text-xs overflow-x-auto">
                {JSON.stringify(latestBrief, null, 2)}
              </pre>
            </>
          )}
        </section>
      )}

      {tab === 'strategy' && (
        <section className="text-sm space-y-2 text-white">
          {!latestStrategy ? (
            <p className="text-[var(--ree-muted)]">Todavía no hay estrategia.</p>
          ) : (
            <pre className="whitespace-pre-wrap bg-[var(--ree-card)] border border-[var(--ree-border)] rounded-lg p-4 text-xs overflow-x-auto">
              {JSON.stringify(latestStrategy, null, 2)}
            </pre>
          )}
        </section>
      )}

      {tab === 'scripts' && (
        <section className="space-y-3">
          {!client.scripts?.length ? (
            <p className="text-[var(--ree-muted)] text-sm">Sin guiones.</p>
          ) : (
            client.scripts.map((sc) => (
              <div
                key={sc.id}
                className="rounded-lg border border-[var(--ree-border)] bg-[var(--ree-card)] p-4 text-sm"
              >
                <div className="text-white font-semibold">
                  {sc.platform} · {sc.format} · {sc.status}
                </div>
                <p className="text-[var(--ree-muted)] mt-2 text-xs">
                  Hook: {sc.hook || '—'}
                </p>
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'docs' && (
        <section className="space-y-2">
          {!documents.length ? (
            <p className="text-[var(--ree-muted)] text-sm">Sin documentos.</p>
          ) : (
            <ul className="list-disc ps-5 text-sm">
              {documents.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--ree-accent)] underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'billing' && (
        <BillingSection
          paymentAmount={client.paymentAmount}
          paymentCurrency={client.paymentCurrency}
          paymentStatus={client.paymentStatus}
          onPatch={patch}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[var(--ree-muted)] text-xs mb-0.5">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  );
}

function BillingSection(props: {
  paymentAmount: number | null;
  paymentCurrency: string;
  paymentStatus: PaymentStatus;
  onPatch: (b: object) => Promise<void>;
}) {
  const { paymentAmount, paymentCurrency, paymentStatus, onPatch } = props;
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(paymentAmount ?? ''));
  const [currency, setCurrency] = useState(paymentCurrency);
  const [status, setStatus] = useState<PaymentStatus>(paymentStatus);

  const save = async () => {
    await onPatch({
      paymentAmount: parseFloat(amount) || 0,
      paymentCurrency: currency,
      paymentStatus: status,
    });
    setEditing(false);
  };

  return (
    <section className="text-sm space-y-4">
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-start w-full rounded-lg border border-[var(--ree-border)] bg-[var(--ree-card)] p-4 hover:border-[var(--ree-accent)]"
        >
          <div className="text-[var(--ree-muted)]">Click para editar</div>
          <div className="text-white text-lg mt-1">
            {paymentCurrency} {paymentAmount ?? '—'}
          </div>
          <div className="text-[var(--ree-muted)] mt-1">{paymentStatus}</div>
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-[var(--ree-border)] bg-[var(--ree-card)] p-4">
          <label className="block text-[var(--ree-muted)]">
            Monto
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded bg-[#0a0a0a] border border-[var(--ree-border)] px-2 py-1 text-white"
            />
          </label>
          <label className="block text-[var(--ree-muted)]">
            Moneda
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded bg-[#0a0a0a] border border-[var(--ree-border)] px-2 py-1 text-white"
            />
          </label>
          <label className="block text-[var(--ree-muted)]">
            Estado pago
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              className="mt-1 w-full rounded bg-[#0a0a0a] border border-[var(--ree-border)] px-2 py-1 text-white"
            >
              {(['PENDING', 'PAID', 'OVERDUE', 'PARTIAL'] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1 rounded border border-[var(--ree-border)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => save().catch(alert)}
              className="px-3 py-1 rounded bg-[var(--ree-accent)] text-white"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
