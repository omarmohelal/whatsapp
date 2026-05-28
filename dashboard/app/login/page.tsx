'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setApiKey } from '../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setKey] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    const data = (await response.json()) as { ok: boolean };
    if (!data.ok) {
      setError('Invalid API key');
      return;
    }
    setApiKey(apiKey);
    router.push('/conversations');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-nexus-line bg-nexus-panel p-6">
        <h1 className="mb-1 text-2xl font-semibold">TheNexus Admin</h1>
        <p className="mb-6 text-sm text-slate-400">Sign in with the admin API key.</p>
        <input
          className="mb-3 w-full rounded-md border border-nexus-line bg-black/20 px-3 py-2 outline-none focus:border-emerald-400"
          type="password"
          value={apiKey}
          onChange={(event) => setKey(event.target.value)}
          placeholder="ADMIN_API_KEY"
        />
        {error ? <div className="mb-3 text-sm text-red-300">{error}</div> : null}
        <button className="w-full rounded-md bg-emerald-500 px-3 py-2 font-medium text-black">
          Login
        </button>
      </form>
    </main>
  );
}
