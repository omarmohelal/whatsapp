'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Shell } from '../../components/Shell';
import { apiFetch } from '../../lib/api';

interface KnowledgeDoc {
  id: string;
  title: string;
  body: string;
  status: string;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function load() {
    const result = await apiFetch<{ data: KnowledgeDoc[] }>('/admin/knowledge');
    setDocs(result.data);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await apiFetch('/admin/knowledge', {
      method: 'POST',
      body: JSON.stringify({ title, body, status: 'PENDING' })
    });
    setTitle('');
    setBody('');
    await load();
  }

  async function editDoc(doc: KnowledgeDoc) {
    const nextTitle = window.prompt('Title', doc.title);
    if (nextTitle === null) return;
    const nextBody = window.prompt('Body', doc.body);
    if (nextBody === null) return;
    await apiFetch(`/admin/knowledge/${doc.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: nextTitle, body: nextBody })
    });
    await load();
  }

  return (
    <Shell>
      <h1 className="mb-5 text-2xl font-semibold">Knowledge Base</h1>
      <Card className="mb-5">
        <form onSubmit={submit} className="grid gap-3">
          <input className="rounded-md border border-nexus-line bg-black/20 p-2" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea className="min-h-28 rounded-md border border-nexus-line bg-black/20 p-2" placeholder="Approved business knowledge" value={body} onChange={(event) => setBody(event.target.value)} />
          <button className="w-fit rounded-md bg-emerald-500 px-4 py-2 text-black">Add Knowledge</button>
        </form>
      </Card>
      <button className="mb-4 rounded-md border border-nexus-line px-3 py-2" onClick={() => apiFetch('/admin/knowledge/reindex', { method: 'POST' })}>
        Reindex
      </button>
      <div className="space-y-3">
        {docs.map((doc) => (
          <Card key={doc.id}>
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-medium">{doc.title}</div>
                <div className="text-xs text-slate-400">{doc.status}</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded border border-nexus-line px-2 py-1 text-sm" onClick={() => editDoc(doc)}>
                  Edit
                </button>
                <button className="rounded border border-nexus-line px-2 py-1 text-sm" onClick={() => apiFetch(`/admin/knowledge/${doc.id}/approve`, { method: 'POST' }).then(load)}>
                  Approve
                </button>
                <button className="rounded border border-nexus-line px-2 py-1 text-sm" onClick={() => apiFetch(`/admin/knowledge/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PENDING' }) }).then(load)}>
                  Unapprove
                </button>
                <button className="rounded border border-red-500/50 px-2 py-1 text-sm text-red-200" onClick={() => apiFetch(`/admin/knowledge/${doc.id}`, { method: 'DELETE' }).then(load)}>
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{doc.body}</p>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
