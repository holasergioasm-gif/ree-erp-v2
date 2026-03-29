// @ts-nocheck
'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useReeClients } from '@gitroom/frontend/components/ree/hooks/use-ree-clients';
import type { ContractType, PaymentStatus, PipelineStage } from '@prisma/client';
import {
  PIPELINE_STAGES,
  pipelineStageColor,
} from '@gitroom/frontend/lib/ree/pipeline';

type FilterKind = 'all' | 'active' | 'inactive' | PipelineStage;

function paymentBadgeClass(s: PaymentStatus) {
  if (s === 'PAID') {
    return 'bg-green-900/50 text-green-300 border-green-700';
  }
  if (s === 'OVERDUE') {
    return 'bg-red-900/50 text-red-300 border-red-700';
  }
  if (s === 'PARTIAL') {
    return 'bg-amber-900/50 text-amber-200 border-amber-700';
  }
  return 'bg-yellow-900/40 text-yellow-200 border-yellow-700';
}

export default function ReeClientsPage() {
  const { data: clients, mutate } = useReeClients();
  const list = Array.isArray(clients) ? clients : [];

  const [filter, setFilter] = useState<FilterKind>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return list.filter((c) => {
      if (filter === 'active') {
        return c.status === 'ACTIVE';
      }
      if (filter === 'inactive') {
        return c.status === 'INACTIVE';
      }
      if (filter !== 'all') {
        return c.pipelineStage === filter;
      }
      return true;
    });
  }, [list, filter]);

  const patchClient = useCallback(
    async (id: string, body: object) => {
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
    [mutate]
  );

  const deleteClient = useCallback(
    async (id: string) => {
      const res = await fetch(`/ree/api/clients/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'No se pudo eliminar');
      }
      await mutate();
    },
    [mutate]
  );

  return (
    <div className="min-h-full px-6 py-8 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--ree-accent)' }}>
          [ CLIENTES REE ]
        </h1>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setModal(true);
          }}
          className="px-4 py-2 rounded-lg font-semibold text-white bg-[var(--ree-accent)] hover:opacity-90"
        >
          + NUEVO CLIENTE
        </button>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ['all', 'Todos'],
            ['active', 'Activos'],
            ['inactive', 'Inactivos'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-md text-sm border ${
              filter === k
                ? 'border-[var(--ree-accent)] text-white'
                : 'border-[var(--ree-border)] text-[var(--ree-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
        <select
          value={
            PIPELINE_STAGES.some((s) => s.id === filter) ? filter : ''
          }
          onChange={(e) => {
            const v = e.target.value as PipelineStage | '';
            setFilter(v || 'all');
          }}
          className="bg-[var(--ree-card)] border border-[var(--ree-border)] rounded-md px-2 py-1 text-sm text-white"
        >
          <option value="">Etapa: todas</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-[var(--ree-border)] bg-[var(--ree-card)] p-4 relative"
          >
            <div className="flex justify-between gap-2">
              <Link href={`/ree/clients/${c.id}`} className="flex-1 min-w-0">
                <div className="font-bold text-lg text-white truncate">
                  {c.company || c.name}
                </div>
                <div className="text-sm text-[var(--ree-muted)] truncate">
                  {c.email}
                </div>
              </Link>
              <div className="relative">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-[var(--ree-muted)]"
                  aria-label="Menú"
                  onClick={() =>
                    setMenuOpen(menuOpen === c.id ? null : c.id)
                  }
                >
                  ⋮
                </button>
                {menuOpen === c.id && (
                  <div className="absolute end-0 top-9 z-10 min-w-[160px] rounded-lg border border-[var(--ree-border)] bg-[#1a1a1a] py-1 shadow-lg text-sm">
                    <button
                      type="button"
                      className="block w-full text-start px-3 py-2 hover:bg-white/10"
                      onClick={async () => {
                        setMenuOpen(null);
                        await patchClient(c.id, { status: 'INACTIVE' });
                      }}
                    >
                      Dar de baja
                    </button>
                    <button
                      type="button"
                      className="block w-full text-start px-3 py-2 hover:bg-white/10"
                      onClick={async () => {
                        setMenuOpen(null);
                        await patchClient(c.id, { status: 'ACTIVE' });
                      }}
                    >
                      Reactivar
                    </button>
                    <button
                      type="button"
                      className="block w-full text-start px-3 py-2 text-red-400 hover:bg-white/10"
                      onClick={async () => {
                        setMenuOpen(null);
                        if (
                          !confirm(
                            '¿Eliminar cliente? Solo administradores. Esta acción no se puede deshacer.'
                          )
                        ) {
                          return;
                        }
                        try {
                          await deleteClient(c.id);
                        } catch (e) {
                          alert((e as Error).message);
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="text-xs px-2 py-0.5 rounded border border-white/20"
                style={{
                  color: pipelineStageColor(c.pipelineStage),
                }}
              >
                {c.pipelineStage.replace(/_/g, ' ')}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${paymentBadgeClass(
                  c.paymentStatus
                )}`}
              >
                {c.paymentStatus}
              </span>
            </div>
            <div className="mt-2 text-sm text-[var(--ree-muted)]">
              {c.paymentCurrency}{' '}
              <span className="text-white font-medium">
                {c.paymentAmount ?? '—'}
              </span>
              /mes
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <NewClientModal
          onClose={() => setModal(false)}
          error={formError}
          setError={setFormError}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onCreated={async () => {
            await mutate();
            setModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewClientModal(props: {
  onClose: () => void;
  error: string | null;
  setError: (s: string | null) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const {
    onClose,
    error,
    setError,
    submitting,
    setSubmitting,
    onCreated,
  } = props;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const contractType = String(fd.get('contractType') || '') as ContractType;
    const paymentAmount = parseFloat(String(fd.get('paymentAmount') || ''));
    const paymentCurrency = String(fd.get('paymentCurrency') || 'USD').trim();
    const platformsRaw = String(fd.get('platforms') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const deliverablesRaw = String(fd.get('deliverables') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const company = String(fd.get('company') || '').trim();

    setSubmitting(true);
    try {
      const res = await fetch('/ree/api/clients', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company: company || undefined,
          contractType,
          platforms: platformsRaw,
          deliverables: deliverablesRaw,
          paymentAmount,
          paymentCurrency,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Error al crear');
        return;
      }
      await onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--ree-border)] bg-[var(--ree-card)] p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Nuevo cliente</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 text-sm">
          <label className="text-[var(--ree-muted)]">
            Nombre <span className="text-[var(--ree-accent)]">*</span>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            />
          </label>
          <label className="text-[var(--ree-muted)]">
            Email <span className="text-[var(--ree-accent)]">*</span>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            />
          </label>
          <label className="text-[var(--ree-muted)]">
            Empresa
            <input
              name="company"
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            />
          </label>
          <label className="text-[var(--ree-muted)]">
            Tipo de contrato <span className="text-[var(--ree-accent)]">*</span>
            <select
              name="contractType"
              required
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            >
              <option value="MONTHLY">MONTHLY</option>
              <option value="MODULAR">MODULAR</option>
            </select>
          </label>
          <label className="text-[var(--ree-muted)]">
            Plataformas (coma) <span className="text-[var(--ree-accent)]">*</span>
            <input
              name="platforms"
              placeholder="Instagram, TikTok"
              required
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            />
          </label>
          <label className="text-[var(--ree-muted)]">
            Entregables (coma) <span className="text-[var(--ree-accent)]">*</span>
            <input
              name="deliverables"
              placeholder="Reels, Stories"
              required
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            />
          </label>
          <label className="text-[var(--ree-muted)]">
            Monto / mes <span className="text-[var(--ree-accent)]">*</span>
            <input
              name="paymentAmount"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            />
          </label>
          <label className="text-[var(--ree-muted)]">
            Moneda <span className="text-[var(--ree-accent)]">*</span>
            <input
              name="paymentCurrency"
              defaultValue="USD"
              required
              className="mt-1 w-full rounded-md bg-[#0a0a0a] border border-[var(--ree-border)] px-3 py-2 text-white"
            />
          </label>
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--ree-border)] text-[var(--ree-muted)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[var(--ree-accent)] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
