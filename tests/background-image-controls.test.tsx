import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { Form } from '@/components/ui/form';

vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);

type Values = { focal_point_x: number; focal_point_y: number; background_opacity: number };
const initial: Values = { focal_point_x: 0, focal_point_y: 100, background_opacity: 0 };
function Editor({ saved = initial, onSave = vi.fn(), image = 'data:image/png;base64,fixture' }: {
  saved?: Values; onSave?: (values: Values) => void; image?: string | null;
}) {
  const form = useForm<Values>({ defaultValues: saved });
  const values = form.watch();
  return <Form {...form}><form onSubmit={form.handleSubmit(onSave)}>
    <BackgroundImageSelector control={form.control} setValue={form.setValue} imagePreview={image}
      initialPosition={{ x: values.focal_point_x, y: values.focal_point_y }} onRemoveImage={vi.fn()} onImageUpload={vi.fn()} />
    <button type="submit">Save test image settings</button>
  </form></Form>;
}

function axis(name: string) { return screen.getByRole('slider', { name }) as HTMLInputElement; }

describe('shared core-editor focal controls', () => {
  it('exposes native keyboard-focusable axes, preserves zeros/extremes, and saves the changed coordinates', async () => {
    const onSave = vi.fn(); const user = userEvent.setup();
    render(<Editor onSave={onSave} />);
    const horizontal = axis('Horizontal focal point'), vertical = axis('Vertical focal point');
    expect(horizontal.type).toBe('range'); expect(horizontal.value).toBe('0');
    expect(vertical.type).toBe('range'); expect(vertical.value).toBe('100');
    expect(axis('Image Opacity (0%)').value).toBe('0');
    await user.tab(); expect(document.activeElement).toBe(horizontal);
    await user.tab(); expect(document.activeElement).toBe(vertical);
    // Native arrow/Home/End behavior is browser-owned; jsdom does not implement
    // it. Assert the native input/change -> preview -> submitted values path.
    fireEvent.change(horizontal, { target: { value: '100' } });
    fireEvent.change(vertical, { target: { value: '0' } });
    expect(screen.getByAltText('Background preview').style.objectPosition).toBe('100% 0%');
    await user.click(screen.getByRole('button', { name: 'Save test image settings' }));
    expect(onSave.mock.calls[0][0]).toEqual({ focal_point_x: 100, focal_point_y: 0, background_opacity: 0 });
    cleanup(); render(<Editor saved={onSave.mock.calls[0][0]} />);
    expect(axis('Horizontal focal point').value).toBe('100');
    expect(axis('Vertical focal point').value).toBe('0');
  });

  it('keeps mouse and touch coordinates synchronized with both native controls', () => {
    render(<Editor />);
    const preview = screen.getByAltText('Background preview').parentElement!;
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 200, height: 100 } as DOMRect);
    const drag = screen.getByText('Click and drag to adjust focal point').parentElement!;
    fireEvent.mouseDown(drag, { clientX: 60, clientY: 95 });
    expect(axis('Horizontal focal point').value).toBe('25'); expect(axis('Vertical focal point').value).toBe('75');
    fireEvent.mouseMove(document, { clientX: -20, clientY: 200 }); fireEvent.mouseUp(document);
    expect(axis('Horizontal focal point').value).toBe('0'); expect(axis('Vertical focal point').value).toBe('100');
    fireEvent.touchStart(drag, { touches: [{ clientX: 210, clientY: 20 }] });
    fireEvent.touchEnd(document);
    expect(axis('Horizontal focal point').value).toBe('100'); expect(axis('Vertical focal point').value).toBe('0');
  });

  it('offers no focal controls before an image is selected', () => {
    render(<Editor image={null} />);
    expect(screen.queryByRole('slider')).toBeNull();
  });
});
