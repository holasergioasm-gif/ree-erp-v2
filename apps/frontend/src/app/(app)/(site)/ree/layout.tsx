import '@gitroom/frontend/styles/ree-tokens.css';
import { ReactNode } from 'react';

export default function ReeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ree-surface min-h-full text-[var(--ree-text)] bg-[var(--ree-bg)]">
      {children}
    </div>
  );
}
