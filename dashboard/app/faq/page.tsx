'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Shell } from '../../components/Shell';
import { apiFetch } from '../../lib/api';

interface Suggestion {
  id: string;
  question: string;
  answer: string;
  status: string;
}

export default function FaqPage() {
  const [items, setItems] = useState<Suggestion[]>([]);

  async function load() {
    const result = await apiFetch<{ data: Suggestion[] }>('/admin/faq-suggestions');
    setItems(result.data);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <Shell>
      <h1 className="mb-5 text-2xl font-semibold">FAQ Suggestions</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-medium">{item.question}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{item.answer || 'Waiting for admin answer'}</p>
              </div>
              <button className="h-fit rounded border border-nexus-line px-2 py-1 text-sm" onClick={() => apiFetch(`/admin/faq-suggestions/${item.id}/approve`, { method: 'POST' }).then(load)}>
                Approve
              </button>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
