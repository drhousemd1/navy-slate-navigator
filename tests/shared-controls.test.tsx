import React, { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { toast as sonnerToast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';

afterEach(() => {
  act(() => { sonnerToast.dismiss(); });
  cleanup();
});

describe('Slider consumer contract', () => {
  it('connects existing FormControl labels to the actual input and keeps zero', () => {
    function OpacityForm() {
      const form = useForm({ defaultValues: { opacity: 0 } });
      return <Form {...form}><form><FormField control={form.control} name="opacity" render={({ field }) => (
        <FormItem><FormLabel>Image opacity</FormLabel><FormControl>
          <Slider value={[field.value]} onValueChange={values => field.onChange(values[0])} min={0} max={100} step={1} />
        </FormControl></FormItem>
      )} /></form></Form>;
    }
    render(<OpacityForm />);
    const input = screen.getByRole('slider', { name: 'Image opacity' }) as HTMLInputElement;
    expect(input.type).toBe('range');
    expect(input.value).toBe('0');
    expect(screen.getByLabelText('Image opacity')).toBe(input);
    fireEvent.input(input, { target: { value: '37' } });
    expect(input.value).toBe('37');
  });

  it('reports intermediate values and a return to the starting value using the latest callback', () => {
    const changes: string[] = [];
    function Controlled() {
      const [value, setValue] = useState(50);
      const [label, setLabel] = useState('first');
      return <><button onClick={() => setLabel('second')}>Change callback</button>
        <Slider aria-label="Energy" value={[value]} step={5} onValueChange={values => {
          changes.push(`${label}:${values[0]}`);
          setValue(values[0]);
        }} />
      </>;
    }
    render(<Controlled />);
    const input = screen.getByRole('slider', { name: 'Energy' });
    fireEvent.input(input, { target: { value: '55' } });
    fireEvent.input(input, { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change callback' }));
    fireEvent.input(input, { target: { value: '50' } });
    expect(changes).toEqual(['first:55', 'first:80', 'second:50']);
  });

  it('exposes native bounds and step; disabled historical values are skipped by Tab', async () => {
    const user = userEvent.setup();
    render(<><button>Before</button>
      <Slider aria-label="Historical energy" value={[75]} min={0} max={100} step={5} disabled onValueChange={() => { throw new Error('Read-only slider changed'); }} />
      <button>After</button></>);
    const input = screen.getByRole('slider', { name: 'Historical energy' }) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect([input.min, input.max, input.step]).toEqual(['0', '100', '5']);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Before' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
  });
});

// jsdom has no native range keyboard/drag engine. The browser fixture exercises
// Arrow/Home/End and real pointer input; these tests cover the React contract.
for (const kind of ['dialog', 'sheet'] as const) {
  const Root = kind === 'dialog' ? Dialog : Sheet;
  const Content = kind === 'dialog' ? DialogContent : SheetContent;
  const Title = kind === 'dialog' ? DialogTitle : SheetTitle;
  const Description = kind === 'dialog' ? DialogDescription : SheetDescription;
  const Trigger = kind === 'dialog' ? DialogTrigger : SheetTrigger;

  describe(`${kind} focus`, () => {
    it('focuses inside and returns to a controlled external opener without a Radix Trigger', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [open, setOpen] = useState(false);
        return <><button onClick={() => setOpen(true)}>Open editor</button>
          <Root open={open} onOpenChange={setOpen}><Content>
            <Title>Editor</Title><Description>Local test form</Description>
            <input aria-label="Title" /><button onClick={() => setOpen(false)}>Cancel editing</button>
          </Content></Root>
        </>;
      }
      render(<React.StrictMode><Controlled /></React.StrictMode>);
      const opener = screen.getByRole('button', { name: 'Open editor' });
      await user.click(opener);
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Title' }));
      await user.keyboard('{Escape}');
      await waitFor(() => expect(document.activeElement).toBe(opener));
    });

    it('keeps ordinary Radix Trigger focus return working', async () => {
      const user = userEvent.setup();
      render(<Root><Trigger asChild><button>Open panel</button></Trigger><Content>
        <Title>Panel</Title><Description>Local test panel</Description><button>First action</button>
      </Content></Root>);
      const opener = screen.getByRole('button', { name: 'Open panel' });
      await user.click(opener);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First action' }));
      await user.keyboard('{Escape}');
      await waitFor(() => expect(document.activeElement).toBe(opener));
    });

    it('honors explicit consumer initial and return focus overrides', async () => {
      const user = userEvent.setup();
      function Override() {
        const preferred = useRef<HTMLInputElement>(null);
        const destination = useRef<HTMLButtonElement>(null);
        return <><button ref={destination}>Chosen return point</button><Root>
          <Trigger asChild><button>Open custom panel</button></Trigger>
          <Content onOpenAutoFocus={event => { event.preventDefault(); preferred.current?.focus(); }}
            onCloseAutoFocus={event => { event.preventDefault(); destination.current?.focus(); }}>
            <Title>Custom panel</Title><Description>Consumer focus policy</Description>
            <input aria-label="First" /><input aria-label="Preferred" ref={preferred} />
          </Content>
        </Root></>;
      }
      render(<Override />);
      await user.click(screen.getByRole('button', { name: 'Open custom panel' }));
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Preferred' }));
      await user.keyboard('{Escape}');
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chosen return point' })));
    });
  });
}

it('returns focus through a nested picker before returning to the external editor opener', async () => {
  const user = userEvent.setup();
  function NestedEditors() {
    const [open, setOpen] = useState(false);
    const [nested, setNested] = useState(false);
    return <><button onClick={() => setOpen(true)}>Open outer editor</button>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogTitle>Outer editor</DialogTitle><DialogDescription>Local form</DialogDescription>
        <input aria-label="Outer title" /><button onClick={() => setNested(true)}>Open picker</button>
        <Dialog open={nested} onOpenChange={setNested}><DialogContent>
          <DialogTitle>Picker</DialogTitle><DialogDescription>Local options</DialogDescription>
          <button>Choose icon</button>
        </DialogContent></Dialog>
      </DialogContent></Dialog>
    </>;
  }
  render(<NestedEditors />);
  const opener = screen.getByRole('button', { name: 'Open outer editor' });
  await user.click(opener);
  const pickerOpener = screen.getByRole('button', { name: 'Open picker' });
  await user.click(pickerOpener);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose icon' }));
  await user.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(pickerOpener));
  await user.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(opener));
});

it('renders the original compact toast without a description and keeps the action usable', async () => {
  const user = userEvent.setup();
  const retryUpload = vi.fn();
  render(<Toaster />);
  const description = 'The image could not be uploaded. Keep this draft and try again when the connection returns.';
  act(() => { toast({ title: 'Upload failed', description, variant: 'destructive', action: <button onClick={retryUpload}>Retry upload</button> }); });
  const title = await screen.findByText('Upload failed');
  expect(screen.queryByText(description)).toBeNull();
  expect(title.closest('[data-sonner-toast]')?.className).toContain('single-line-toast');
  expect(screen.queryByRole('button', { name: 'Close toast' })).toBeNull();
  const item = sonnerToast.getHistory().find(item => 'title' in item && item.title === 'Upload failed');
  expect(item).toMatchObject({ description: null, duration: 2000, position: 'top-center' });
  // Keyboard activation keeps the action accessible in the compact renderer.
  act(() => { screen.getByRole('button', { name: 'Retry upload' }).focus(); });
  await user.keyboard('{Enter}');
  expect(retryUpload).toHaveBeenCalledOnce();
});
