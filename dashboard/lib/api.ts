'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function getApiKey() {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem('thenexus_admin_key') ?? '';
}

export function setApiKey(value: string) {
  window.localStorage.setItem('thenexus_admin_key', value);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-admin-api-key': getApiKey(),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
