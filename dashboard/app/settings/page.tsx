'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Shell } from '../../components/Shell';
import { apiFetch } from '../../lib/api';

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('TheNexus');
  const [secureFormUrl, setSecureFormUrl] = useState('https://www.thenexus.ink/');
  const [adminNotificationNumber, setAdminNotificationNumber] = useState('');

  useEffect(() => {
    apiFetch<any>('/admin/settings').then((data) => {
      setBusinessName(data.business?.name ?? 'TheNexus');
      const settings = Object.fromEntries((data.settings ?? []).map((item: any) => [item.key, item.value]));
      setSecureFormUrl(settings.secureFormUrl ?? 'https://www.thenexus.ink/');
      setAdminNotificationNumber(settings.adminNotificationNumber ?? '');
    }).catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    await apiFetch('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        businessName,
        defaultLanguage: 'egyptian_arabic',
        agentTone: 'short_warm_professional_sales_friendly',
        secureFormUrl,
        adminNotificationNumber
      })
    });
  }

  return (
    <Shell>
      <h1 className="mb-5 text-2xl font-semibold">Settings</h1>
      <Card>
        <form onSubmit={save} className="grid max-w-xl gap-3">
          <label className="text-sm text-slate-300">Business name</label>
          <input className="rounded-md border border-nexus-line bg-black/20 p-2" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
          <label className="text-sm text-slate-300">Secure form URL</label>
          <input className="rounded-md border border-nexus-line bg-black/20 p-2" value={secureFormUrl} onChange={(event) => setSecureFormUrl(event.target.value)} />
          <label className="text-sm text-slate-300">Admin notification number</label>
          <input className="rounded-md border border-nexus-line bg-black/20 p-2" value={adminNotificationNumber} onChange={(event) => setAdminNotificationNumber(event.target.value)} />
          <button className="w-fit rounded-md bg-emerald-500 px-4 py-2 text-black">Save</button>
        </form>
      </Card>
    </Shell>
  );
}
