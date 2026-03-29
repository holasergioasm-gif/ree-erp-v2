import { ReactNode, Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function ReeAgentLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
