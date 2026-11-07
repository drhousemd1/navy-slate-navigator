import { useColorScheme } from '@/contexts/ColorSchemeContext';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getBrowserTimezone, isValidTimezone } from '@/lib/identity';

export default function TimezoneSection() {
  const isLightScheme = useColorScheme().currentScheme === 'light-turquoise';
  const { relationshipIdentity: identity, updateTimezone, refreshIdentity } = useAuth();
  const accountId = identity.currentUserId;
  const currentAccount = useRef(accountId);
  currentAccount.current = accountId;
  const mounted = useRef(true);
  const [draft, setDraft] = useState(identity.timezone ?? getBrowserTimezone() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    setDraft(identity.timezone ?? getBrowserTimezone() ?? '');
    setError(null);
    setBusy(false);
  }, [accountId, identity.timezone]);

  const choices = useMemo(() => {
    const supported = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
    let available: string[] = [];
    try { available = supported.supportedValuesOf?.('timeZone') ?? []; } catch { /* Manual entry remains available. */ }
    return [...new Set(['UTC', identity.timezone, getBrowserTimezone(), ...available].filter((zone): zone is string => !!zone))].sort();
  }, [identity.timezone]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const timezone = draft.trim();
    if (!isValidTimezone(timezone)) {
      setError('Choose a valid timezone, such as America/Boise or Europe/London.');
      return;
    }
    const expectedAccount = accountId;
    setBusy(true);
    setError(null);
    try {
      const saved = await updateTimezone(timezone);
      if (mounted.current && currentAccount.current === expectedAccount && !saved) {
        setError('The timezone change was not confirmed. Check your connection and try again.');
      }
    } catch {
      if (mounted.current && currentAccount.current === expectedAccount) {
        setError('The timezone change was not confirmed. Check your connection and try again.');
      }
    } finally {
      if (mounted.current && currentAccount.current === expectedAccount) setBusy(false);
    }
  };

  return <section className="mb-8 space-y-3" aria-labelledby="timezone-heading">
    <h2 id="timezone-heading" className={`text-lg font-semibold ${isLightScheme ? 'text-foreground' : 'text-white'}`}>Your Timezone</h2>
    <p className={`text-sm ${isLightScheme ? 'text-foreground' : 'text-gray-400'}`}>Your own deadlines use this saved timezone. We use your browser timezone only for the initial default; travel will not change it automatically.</p>
    <p className={`text-sm ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>Saved timezone: <span className="font-medium">{identity.timezone ?? 'Not set yet'}</span></p>
    <form onSubmit={event => void save(event)} className="space-y-3">
      <Label htmlFor="profile-timezone" className={isLightScheme ? 'text-foreground' : 'text-gray-300'}>Timezone</Label>
      <Input id="profile-timezone" list="profile-timezone-options" value={draft} onChange={event => { setDraft(event.target.value); setError(null); }} autoComplete="off" spellCheck={false} disabled={busy || !identity.canAccessData} className={`bg-navy border-light-navy ${isLightScheme ? 'text-foreground' : 'text-white'}`} placeholder="America/Boise" aria-describedby="timezone-hint" />
      <datalist id="profile-timezone-options">{choices.map(zone => <option key={zone} value={zone} />)}</datalist>
      <p id="timezone-hint" className={`text-xs ${isLightScheme ? 'text-foreground' : 'text-gray-400'}`}>Search by region and city, or enter an IANA timezone such as America/Boise.</p>
      <Button type="submit" disabled={busy || !identity.canAccessData || draft.trim() === identity.timezone} className="bg-gray-600 text-white hover:bg-gray-500">{busy ? 'Saving…' : 'Save Timezone'}</Button>
    </form>
    {identity.timezoneInitializationError && <div className="space-y-2">
      <p role="alert" className={`text-sm ${isLightScheme ? 'text-amber-900' : 'text-amber-300'}`}>{identity.timezoneInitializationError}</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void refreshIdentity()}>Retry default timezone</Button>
    </div>}
    {error && <p role="alert" className={`text-sm ${isLightScheme ? 'text-red-700' : 'text-red-300'}`}>{error}</p>}
  </section>;
}
