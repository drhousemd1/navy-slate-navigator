import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import '@/index.css';

// This entry deliberately imports no app providers, service worker or backend.
export function SharedControlsFixture() {
  const [value, setValue] = useState(50);
  const [values, setValues] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const buttonClass = 'focus-visible:ring-2 focus-visible:ring-cyan-500';
  const buttonStyle: React.CSSProperties = { border: '1px solid #222d42', borderRadius: 6, padding: '8px 16px', maxWidth: '100%' };

  return <main className="bg-navy text-white" style={{ height: '100dvh', overflowY: 'auto', padding: 24 }}>
    <div style={{ maxWidth: '36rem', margin: '0 auto', display: 'grid', gap: 32 }}>
      <h1 className="text-xl font-bold">Shared controls — local fixture</h1>
      <p>No account or backend is used. This fixture is not part of the product routes.</p>
      <section>
        <label htmlFor="energy">Energy ({value}%)</label>
        <Slider id="energy" min={0} max={100} step={5} value={[value]} onValueChange={next => {
          setValue(next[0]); setValues(previous => [...previous.slice(-19), next[0]]);
        }} fillColor="#00C2FF" backgroundColor="#222d42" />
        <output aria-label="Current energy">{value}</output>
        <p>Input values: <output data-testid="input-values">{values.join(', ')}</output></p>
        <label htmlFor="history">Historical energy (read only)</label>
        <Slider id="history" disabled value={[75]} onValueChange={() => { throw new Error('Disabled input changed'); }} />
      </section>
      <section style={{ display: 'grid', gap: 12 }}>
        <button className={buttonClass} style={buttonStyle} onClick={() => setOpen(true)}>Open controlled editor</button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-navy text-white">
            <DialogTitle>Controlled editor</DialogTitle>
            <DialogDescription>Local form with an external opener and nested dialog.</DialogDescription>
            <label>Title<input className="block bg-light-navy p-2" defaultValue="Existing title" /></label>
            <button className={buttonClass} style={buttonStyle} onClick={() => setNestedOpen(true)}>Open nested picker</button>
            <button className={buttonClass} style={buttonStyle} onClick={() => setOpen(false)}>Cancel editing</button>
            <Dialog open={nestedOpen} onOpenChange={setNestedOpen}>
              <DialogContent className="bg-navy text-white">
                <DialogTitle>Nested picker</DialogTitle>
                <DialogDescription>Closing should return to the picker button.</DialogDescription>
                <button className={buttonClass} style={buttonStyle} onClick={() => setNestedOpen(false)}>Choose existing icon</button>
              </DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>
      </section>
      <section>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild><button aria-label="Open account menu" className={buttonClass} style={buttonStyle}>Account</button></SheetTrigger>
          <SheetContent side="left" className="bg-navy text-white">
            <SheetTitle>Account menu</SheetTitle><SheetDescription>Local focus fixture</SheetDescription>
            <button className={buttonClass} style={buttonStyle}>Account settings</button>
            <button className={buttonClass} style={buttonStyle} onClick={() => setSheetOpen(false)}>Close account menu</button>
          </SheetContent>
        </Sheet>
      </section>
      <section>
        <button className={buttonClass} style={buttonStyle} onClick={() => toast({
          title: 'Upload failed',
          description: 'The image could not be uploaded. Your draft has been kept. Check your connection and try again without closing the editor.',
          variant: 'destructive',
        })}>Show actionable error</button>
      </section>
      <Toaster />
    </div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><SharedControlsFixture /></React.StrictMode>);
