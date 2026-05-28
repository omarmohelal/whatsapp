'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Shell } from '../../components/Shell';
import { apiFetch } from '../../lib/api';

export default function AnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    apiFetch<Record<string, unknown>>('/admin/analytics').then(setData).catch(() => undefined);
  }, []);

  const cards: Array<[string, unknown]> = [
    ['Total conversations', data.totalConversations],
    ['AI replies', data.aiReplies],
    ['Human handoffs', data.humanHandoffs],
    ['Unanswered questions', data.unansweredQuestions],
    ['Sensitive', data.sensitive],
    ['Approved knowledge', data.approvedKnowledge]
  ];

  return (
    <Shell>
      <h1 className="mb-5 text-2xl font-semibold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <div className="text-sm text-slate-400">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{String(value ?? 0)}</div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
