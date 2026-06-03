'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Shell } from '../../components/Shell';
import { apiFetch } from '../../lib/api';

const defaultTone =
  'رد بالمصري، مختصر، محترم، ودود ومناسب للمبيعات. اسأل سؤال واحد بس لما تحتاج توضيح.';
const defaultKnowledge =
  'TheNexus يدعم شحن Wild Rift وLeague RP وValorant VP، هدايا/سكنات Riot، وبيع وشراء الأكونتات. لا تخترع أسعار أو توفر.';

function Toggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-md border border-nexus-line bg-black/20 px-3 py-2 text-sm text-slate-200">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-emerald-400"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('TheNexus');
  const [secureFormUrl, setSecureFormUrl] = useState('https://www.thenexus.ink/');
  const [adminNotificationNumber, setAdminNotificationNumber] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(30);
  const [replyDebounceSeconds, setReplyDebounceSeconds] = useState(4);
  const [maxAutoRepliesPerTenMinutes, setMaxAutoRepliesPerTenMinutes] = useState(3);
  const [maxMessagesContext, setMaxMessagesContext] = useState(10);
  const [businessTonePrompt, setBusinessTonePrompt] = useState(defaultTone);
  const [gamesServicesKnowledge, setGamesServicesKnowledge] = useState(defaultKnowledge);
  const [paymentMethodsText, setPaymentMethodsText] = useState(
    'Vodafone Cash: 01007208978\nInstaPay: 01014094664\nPayPal / Crypto / Binance / Credit Card: الأدمن يرسل التفاصيل'
  );
  const [humanHandoffEnabled, setHumanHandoffEnabled] = useState(true);
  const [ignoreStickers, setIgnoreStickers] = useState(true);
  const [groupRepliesEnabled, setGroupRepliesEnabled] = useState(false);
  const [groupPromoEnabled, setGroupPromoEnabled] = useState(false);
  const [groupPromoIntervalMinutes, setGroupPromoIntervalMinutes] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<any>('/admin/settings')
      .then((data) => {
        setBusinessName(data.business?.name ?? 'TheNexus');
        const settings = Object.fromEntries(
          (data.settings ?? []).map((item: any) => [item.key, item.value])
        );
        setSecureFormUrl(settings.secureFormUrl ?? 'https://www.thenexus.ink/');
        setAdminNotificationNumber(settings.adminNotificationNumber ?? '');
        setAiEnabled(settings.aiEnabled ?? true);
        setAutoReplyEnabled(settings.autoReplyEnabled ?? true);
        setCooldownSeconds(settings.cooldownSeconds ?? 30);
        setReplyDebounceSeconds(settings.replyDebounceSeconds ?? 4);
        setMaxAutoRepliesPerTenMinutes(settings.maxAutoRepliesPerTenMinutes ?? 3);
        setMaxMessagesContext(settings.maxMessagesContext ?? 10);
        setBusinessTonePrompt(settings.businessTonePrompt ?? defaultTone);
        setGamesServicesKnowledge(settings.gamesServicesKnowledge ?? defaultKnowledge);
        setPaymentMethodsText(
          (data.paymentMethods ?? [])
            .map((method: any) => `${method.label}: ${method.value}`)
            .join('\n') ||
            'Vodafone Cash: 01007208978\nInstaPay: 01014094664\nPayPal / Crypto / Binance / Credit Card: الأدمن يرسل التفاصيل'
        );
        setHumanHandoffEnabled(settings.humanHandoffEnabled ?? true);
        setIgnoreStickers(settings.ignoreStickers ?? true);
        setGroupRepliesEnabled(settings.groupRepliesEnabled ?? false);
        setGroupPromoEnabled(settings.groupPromoEnabled ?? false);
        setGroupPromoIntervalMinutes(settings.groupPromoIntervalMinutes ?? 0);
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    await apiFetch('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        businessName,
        defaultLanguage: 'egyptian_arabic',
        agentTone: 'short_warm_professional_sales_friendly',
        aiEnabled,
        autoReplyEnabled,
        cooldownSeconds,
        replyDebounceSeconds,
        maxAutoRepliesPerTenMinutes,
        maxMessagesContext,
        businessTonePrompt,
        gamesServicesKnowledge,
        humanHandoffEnabled,
        ignoreStickers,
        groupRepliesEnabled,
        groupPromoEnabled,
        groupPromoIntervalMinutes,
        secureFormUrl,
        adminNotificationNumber,
        paymentMethods: paymentMethodsText
          .split('\n')
          .map((line, index) => {
            const [label, ...valueParts] = line.split(':');
            return {
              label: label.trim(),
              value: valueParts.join(':').trim(),
              isActive: true,
              sortOrder: index
            };
          })
          .filter((method) => method.label && method.value)
      })
    });
    setSaved(true);
  }

  return (
    <Shell>
      <h1 className="mb-5 text-2xl font-semibold">Settings</h1>
      <form onSubmit={save} className="space-y-5">
        <Card>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Business name
              <input
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Admin notification number
              <input
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={adminNotificationNumber}
                onChange={(event) => setAdminNotificationNumber(event.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Secure form URL
              <input
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={secureFormUrl}
                onChange={(event) => setSecureFormUrl(event.target.value)}
              />
            </label>
          </div>
        </Card>

        <Card>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle checked={aiEnabled} label="AI enabled" onChange={setAiEnabled} />
            <Toggle checked={autoReplyEnabled} label="Auto reply enabled" onChange={setAutoReplyEnabled} />
            <Toggle checked={humanHandoffEnabled} label="Human handoff enabled" onChange={setHumanHandoffEnabled} />
            <Toggle checked={ignoreStickers} label="Ignore stickers after one unclear reply" onChange={setIgnoreStickers} />
            <Toggle checked={groupRepliesEnabled} label="Group replies enabled" onChange={setGroupRepliesEnabled} />
            <Toggle checked={groupPromoEnabled} label="Group promo enabled" onChange={setGroupPromoEnabled} />
            <label className="text-sm text-slate-300">
              Cooldown seconds
              <input
                type="number"
                min={5}
                max={40}
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={cooldownSeconds}
                onChange={(event) => setCooldownSeconds(Number(event.target.value))}
              />
            </label>
            <label className="text-sm text-slate-300">
              Reply debounce seconds
              <input
                type="number"
                min={0}
                max={10}
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={replyDebounceSeconds}
                onChange={(event) => setReplyDebounceSeconds(Number(event.target.value))}
              />
            </label>
            <label className="text-sm text-slate-300">
              Max auto replies / 10 min
              <input
                type="number"
                min={1}
                max={10}
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={maxAutoRepliesPerTenMinutes}
                onChange={(event) => setMaxAutoRepliesPerTenMinutes(Number(event.target.value))}
              />
            </label>
            <label className="text-sm text-slate-300">
              Max messages context
              <input
                type="number"
                min={4}
                max={20}
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={maxMessagesContext}
                onChange={(event) => setMaxMessagesContext(Number(event.target.value))}
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Group promo interval minutes
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={groupPromoIntervalMinutes}
                onChange={(event) => setGroupPromoIntervalMinutes(Number(event.target.value))}
              />
            </label>
          </div>
        </Card>

        <Card>
          <div className="grid gap-3">
            <label className="text-sm text-slate-300">
              Business tone prompt
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={businessTonePrompt}
                onChange={(event) => setBusinessTonePrompt(event.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Games/services knowledge
              <textarea
                className="mt-1 min-h-32 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={gamesServicesKnowledge}
                onChange={(event) => setGamesServicesKnowledge(event.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Payment methods
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-nexus-line bg-black/20 p-2"
                value={paymentMethodsText}
                onChange={(event) => setPaymentMethodsText(event.target.value)}
              />
            </label>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button className="rounded-md bg-emerald-500 px-4 py-2 text-black">Save</button>
          {saved ? <span className="text-sm text-emerald-300">Saved</span> : null}
        </div>
      </form>
    </Shell>
  );
}
