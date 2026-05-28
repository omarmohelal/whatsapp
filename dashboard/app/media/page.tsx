'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Shell } from '../../components/Shell';
import { apiFetch } from '../../lib/api';

interface MediaItem {
  id: string;
  key: string;
  game?: string;
  title: string;
  caption?: string;
  imageUrl?: string;
  aliases: string[];
  isActive: boolean;
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [form, setForm] = useState({ key: '', game: '', title: '', caption: '', imageUrl: '', aliases: '' });

  async function load() {
    const result = await apiFetch<{ data: MediaItem[] }>('/admin/media');
    setItems(result.data);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await apiFetch('/admin/media', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        aliases: form.aliases.split(',').map((item) => item.trim()).filter(Boolean),
        imageUrl: form.imageUrl || null,
        isActive: true
      })
    });
    setForm({ key: '', game: '', title: '', caption: '', imageUrl: '', aliases: '' });
    await load();
  }

  async function editItem(item: MediaItem) {
    const imageUrl = window.prompt('Image URL', item.imageUrl ?? '');
    if (imageUrl === null) return;
    const caption = window.prompt('Caption', item.caption ?? '');
    if (caption === null) return;
    const aliases = window.prompt('Aliases, comma separated', item.aliases.join(', '));
    if (aliases === null) return;
    await apiFetch(`/admin/media/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        imageUrl: imageUrl || null,
        caption,
        aliases: aliases.split(',').map((alias) => alias.trim()).filter(Boolean)
      })
    });
    await load();
  }

  async function toggleItem(item: MediaItem) {
    await apiFetch(`/admin/media/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !item.isActive })
    });
    await load();
  }

  return (
    <Shell>
      <h1 className="mb-5 text-2xl font-semibold">Media Catalog</h1>
      <Card className="mb-5">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          {(['key', 'game', 'title', 'caption', 'imageUrl', 'aliases'] as const).map((field) => (
            <input key={field} className="rounded-md border border-nexus-line bg-black/20 p-2" placeholder={field} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
          ))}
          <button className="w-fit rounded-md bg-emerald-500 px-4 py-2 text-black">Add Media</button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="mb-2 flex justify-between">
              <div>
                <div className="font-medium">{item.game ?? item.title}</div>
                <div className="text-xs text-slate-400">{item.key}</div>
              </div>
              <span className="text-xs">{item.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            {item.imageUrl ? <img src={item.imageUrl} alt="" className="mb-3 max-h-48 rounded" /> : null}
            <div className="whitespace-pre-wrap text-sm">{item.caption}</div>
            <div className="mt-2 text-xs text-slate-400">{item.aliases.join(', ')}</div>
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-nexus-line px-2 py-1 text-sm" onClick={() => editItem(item)}>
                Edit
              </button>
              <button className="rounded border border-nexus-line px-2 py-1 text-sm" onClick={() => toggleItem(item)}>
                {item.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
