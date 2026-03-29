'use client';

import useSWR from 'swr';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export function useReeClient(id: string | undefined) {
  return useSWR(id ? `/ree/api/clients/${id}` : null, (url: string) =>
    fetchJson(url)
  );
}
