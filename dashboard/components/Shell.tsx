'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const nav = [
  ['Inbox', '/conversations'],
  ['Knowledge', '/knowledge'],
  ['Media', '/media'],
  ['FAQ', '/faq'],
  ['Analytics', '/analytics'],
  ['Settings', '/settings']
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-nexus-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-nexus-line bg-nexus-panel p-5 md:block">
        <div className="mb-8">
          <div className="text-xl font-semibold">TheNexus</div>
          <div className="text-sm text-slate-400">WhatsApp AI Admin</div>
        </div>
        <nav className="space-y-1">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-md px-3 py-2 text-sm ${
                pathname.startsWith(href)
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="mx-auto max-w-6xl px-4 py-6 md:ml-64 md:px-8">{children}</main>
    </div>
  );
}
