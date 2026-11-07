import React from 'react';
import { checkinTime } from '@/data/wellbeing/calendar';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { METRIC_DEFINITIONS, computeWellbeingScore, getSliderColors, getWellbeingColor, getWellbeingStatus } from '@/lib/wellbeingUtils';
import { useWellbeingDraft } from '@/data/wellbeing/useWellbeingDraft';
import type { WellbeingMetrics, WellbeingScope, WellbeingSnapshot } from '@/data/wellbeing/types';

export default function WellbeingForm({ scope, timezone, latest }: { scope: WellbeingScope; timezone: string | null; latest: WellbeingSnapshot | null }) {
  const navigate = useNavigate(); const state = useWellbeingDraft(scope, timezone, latest);
  const score = computeWellbeingScore(state.draft.metrics);
  const displayedLatest = state.confirmation ?? latest;
  return <div className="space-y-6">
    <Card className="bg-navy border-light-navy"><CardHeader className="text-center"><CardTitle className="text-white">Current Wellbeing Status</CardTitle></CardHeader>
      <CardContent className="text-center"><div className="flex items-center justify-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: getWellbeingColor(score) }}><span className="text-white font-bold text-lg">{score}</span></div>
        <div><p className="text-white font-semibold">{getWellbeingStatus(score)}</p><p className="text-gray-400 text-sm">{score}/100 · {state.confirmation ? 'Saved check-in' : 'Unsaved preview'}</p></div>
      </div><p className="text-sm text-gray-400">{displayedLatest ? checkinTime(displayedLatest) : 'No saved check-in. These starting values are an unsaved draft.'}</p></CardContent>
    </Card>
    <form className="space-y-6" onSubmit={event => { event.preventDefault(); void state.save(); }}>
      <Card className="bg-navy border-light-navy"><CardContent className="pt-6 space-y-6">
        {Object.entries(METRIC_DEFINITIONS).map(([name, definition]) => {
          const key = name as keyof WellbeingMetrics; const value = state.draft.metrics[key];
          return <div key={key}><div className="flex items-center justify-between mb-2"><label id={`wellbeing-${key}`} className="text-white">{definition.label}</label><Badge variant="outline" className="text-white border-gray-400">{value}%</Badge></div>
            <Slider aria-labelledby={`wellbeing-${key}`} min={0} max={100} step={5} value={[value]} disabled={!!state.draft.pending || state.saving || state.storageBlocked}
              onValueChange={values => state.change({ ...state.draft.metrics, [key]: values[0] })} {...getSliderColors(value, key)} />
            <p className="text-xs text-gray-400 mt-1">{key === 'energy' ? '0: very low energy · 100: very high energy' : `0: none · 100: very high ${key === 'intimacy' || key === 'physical_touch' || key === 'emotional_support' ? 'need' : definition.label.toLowerCase()}`}</p>
          </div>;
        })}
      </CardContent></Card>
      {state.draft.pending && <p role="status" className="text-sm text-amber-200">Pending check-in. You chose Save at {new Date(state.draft.pending.clientReportedAt).toLocaleString()} (device-reported time). Its chart date will be the server-recorded day in your saved timezone. Retry checks the original result first.</p>}
      {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state.confirmation && <p role="status" className="text-sm text-cyan-200">Check-in saved. {checkinTime(state.confirmation)}</p>}
      {state.storageBlocked && <Button type="button" variant="outline" onClick={state.recoverStorage}>Retry reading saved draft</Button>}
      {state.canReview && <Button type="button" variant="outline" onClick={state.review}>Review as a new check-in in current timezone</Button>}
      <div className="flex justify-center gap-4"><Button type="button" onClick={() => navigate('/')} className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2">Close</Button>
        <Button type="submit" disabled={state.saving || state.storageBlocked || state.canReview || !timezone} className="bg-nav-active hover:bg-nav-active/80 text-white px-8 py-2">{state.saving ? 'Checking…' : state.draft.pending ? 'Retry saved check-in' : 'Update Status'}</Button>
      </div>
    </form>
  </div>;
}
