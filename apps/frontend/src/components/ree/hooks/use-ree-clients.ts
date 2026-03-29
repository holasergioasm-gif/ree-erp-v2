'use client';

import useSWR from 'swr';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export function useReeClients() {
  return useSWR('/ree/api/clients', (url) => fetchJson(url));
}
