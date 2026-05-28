'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../../components/Card';
import { Shell } from '../../../components/Shell';
import { apiFetch } from '../../../lib/api';

interface Message {
  id: string;
  direction: string;
  body?: string;
  mediaUrl?: string;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  aiEnabled: boolean;
  handoffStatus: string;
  isSensitive: boolean;
  contact: { waId: string; profileName?: string };
  messages: Message[];
}

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const result = await apiFetch<ConversationDetail>(`/admin/conversations/${params.id}`);
    setData(result);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    await apiFetch(`/admin/conversations/${params.id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    setBody('');
    await load();
  }

  async function toggleAi(enabled: boolean) {
    await apiFetch(`/admin/conversations/${params.id}/ai-toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
    await load();
  }

  async function done() {
    await apiFetch(`/admin/conversations/${params.id}/handoff`, {
      method: 'POST',
      body: JSON.stringify({ done: true, reason: 'resolved_by_admin' })
    });
    await load();
  }

  async function markSensitive() {
    await apiFetch(`/admin/conversations/${params.id}/handoff`, {
      method: 'POST',
      body: JSON.stringify({ active: true, sensitive: true, reason: 'marked_sensitive_by_admin' })
    });
    await load();
  }

  return (
    <Shell>
      {error ? <Card className="text-red-300">{error}</Card> : null}
      {data ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{data.contact.profileName ?? data.contact.waId}</h1>
              <p className="text-sm text-slate-400">{data.contact.waId}</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md border border-nexus-line px-3 py-2" onClick={() => toggleAi(!data.aiEnabled)}>
                AI {data.aiEnabled ? 'On' : 'Off'}
              </button>
              <button className="rounded-md border border-red-500/50 px-3 py-2 text-red-200" onClick={markSensitive}>
                Mark Sensitive
              </button>
              <button className="rounded-md bg-emerald-500 px-3 py-2 text-black" onClick={done}>
                Handoff Done
              </button>
            </div>
          </div>
          <Card className="mb-4 max-h-[55vh] space-y-3 overflow-auto">
            {data.messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-md p-3 ${message.direction === 'INBOUND' ? 'bg-black/30' : 'bg-emerald-500/10'}`}
              >
                <div className="mb-1 text-xs text-slate-400">{message.direction} · {new Date(message.createdAt).toLocaleString()}</div>
                {message.mediaUrl ? <img src={message.mediaUrl} alt="" className="mb-2 max-h-48 rounded" /> : null}
                <div className="whitespace-pre-wrap">{message.body}</div>
              </div>
            ))}
          </Card>
          <form onSubmit={send} className="flex gap-2">
            <textarea className="min-h-20 flex-1 rounded-md border border-nexus-line bg-nexus-panel p-3" value={body} onChange={(event) => setBody(event.target.value)} />
            <button className="rounded-md bg-emerald-500 px-5 py-2 font-medium text-black">Send</button>
          </form>
        </>
      ) : null}
    </Shell>
  );
}
