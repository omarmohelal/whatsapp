'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Shell } from '../../components/Shell';
import { apiFetch } from '../../lib/api';

interface Conversation {
  id: string;
  handoffStatus: string;
  isSensitive: boolean;
  unreadCount: number;
  lastMessageAt: string;
  contact: { waId: string; profileName?: string };
  _count: { messages: number };
}

export default function ConversationsPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ data: Conversation[] }>('/admin/conversations')
      .then((data) => setItems(data.data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conversations</h1>
          <p className="text-sm text-slate-400">Inbox, handoff status, and sensitive flags.</p>
        </div>
      </div>
      {error ? <Card className="text-red-300">{error}</Card> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <Link key={item.id} href={`/conversations/${item.id}`}>
            <Card className="flex items-center justify-between hover:border-emerald-500/60">
              <div>
                <div className="font-medium">{item.contact.profileName ?? item.contact.waId}</div>
                <div className="text-sm text-slate-400">
                  {item._count.messages} messages · {new Date(item.lastMessageAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                {item.unreadCount ? <span className="rounded bg-emerald-500 px-2 py-1 text-black">{item.unreadCount}</span> : null}
                <span className="rounded bg-white/10 px-2 py-1">{item.handoffStatus}</span>
                {item.isSensitive ? <span className="rounded bg-red-500/20 px-2 py-1 text-red-200">Sensitive</span> : null}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
