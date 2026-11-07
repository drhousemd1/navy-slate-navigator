import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const theme = vi.hoisted(() => ({ currentScheme: 'light-turquoise' }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => theme }));
import { encyclopediaTextBacking } from '@/data/encyclopedia/contrast';
import EncyclopediaTile from '@/components/encyclopedia/EncyclopediaTile';
import { getColorScheme } from '@/lib/colorSchemes';
import { entry, image } from './encyclopedia.helpers';
const originalNavy = `hsl(${getColorScheme('default')!.variables['--dark-navy']})`;
const backing = (color: string | null, schemeName = theme.currentScheme, extra: Partial<Parameters<typeof encyclopediaTextBacking>[0]> = {}) =>
  encyclopediaTextBacking({ color, schemeName, hasImage: false, highlight: false, surface: 'tile', ...extra });
beforeEach(() => { theme.currentScheme = 'light-turquoise'; });
afterEach(cleanup);
describe('local Encyclopedia custom-color backing', () => {
  it('adds original navy for the saved white/gray colors only when the selected palette needs it', () => {
    expect(backing('#FFFFFF')).toBe(originalNavy); expect(backing('#D1D5DB')).toBe(originalNavy);
    expect(backing('#FFF', 'light-turquoise', { surface: 'popup' })).toBe(originalNavy);
    expect(backing('#FFFFFF', 'default')).toBeUndefined(); expect(backing('#D1D5DB', 'default')).toBeUndefined();
  });
  it('never darkens readable dark text or applies a backing that cannot improve contrast', () => {
    expect(backing('#000000')).toBeUndefined(); expect(backing('#123456')).toBeUndefined();
    expect(backing('#000000', 'default')).toBeUndefined();
    expect(backing('#FFFFFF00')).toBeUndefined(); expect(backing('#0000')).toBeUndefined();
  });
  it('leaves theme defaults, photos, saved highlight and unrecognized legacy colors alone', () => {
    expect(backing(null)).toBeUndefined(); expect(backing('#FFFFFF', 'light-turquoise', { hasImage: true })).toBeUndefined();
    expect(backing('#FFFFFF', 'light-turquoise', { highlight: true })).toBeUndefined(); expect(backing('white')).toBeUndefined();
  });
  it('uses that backing in both the actual tile and popup without changing saved text, colors or entry bytes', () => {
    const original = entry({ image_url: null, title_color: '#FFFFFF', subtext_color: '#D1D5DB' }); const bytes = JSON.stringify(original);
    const view = render(<EncyclopediaTile entry={original} />); const tile = screen.getByRole('button', { name: 'Reference article Saved description' });
    expect(tile.querySelector('h3 > span')?.getAttribute('style')).toContain('background-color');
    expect((tile.querySelector('h3 > span > span') as HTMLElement).style.color).toBe('rgb(255, 255, 255)');
    expect(tile.querySelector('p > span')?.getAttribute('style')).toContain('background-color');
    expect((tile.querySelector('p > span > span') as HTMLElement).style.color).toBe('rgb(209, 213, 219)');
    fireEvent.click(tile); const popup = screen.getByRole('dialog', { name: 'Reference article' });
    expect(popup.querySelector('h1 > span')?.getAttribute('style')).toContain('background-color');
    expect((popup.querySelector('h1 > span > span') as HTMLElement).style.color).toBe('rgb(255, 255, 255)');
    fireEvent.click(screen.getByRole('button', { name: 'Close encyclopedia entry' }));
    theme.currentScheme = 'default'; view.rerender(<EncyclopediaTile entry={original} />);
    expect(screen.getByRole('button').querySelector('h3 > span')?.getAttribute('style')).not.toContain('background-color');
    expect(JSON.stringify(original)).toBe(bytes);
  });
  it('preserves actual photo and highlighter rendering, plus dark custom text on light surfaces', () => {
    const view = render(<EncyclopediaTile entry={entry({ title_color: '#FFFFFF', subtext_color: '#D1D5DB', image_url: image })} />);
    expect(screen.getByRole('button').querySelector('h3 > span')?.getAttribute('style')).not.toContain('background-color');
    view.rerender(<EncyclopediaTile entry={entry({ image_url: null, title_color: '#000000', subtext_color: '#123456' })} />);
    expect((screen.getByRole('button').querySelector('h3 > span') as HTMLElement).style.color).toBe('rgb(0, 0, 0)');
    expect(screen.getByRole('button').querySelector('h3 > span')?.getAttribute('style')).not.toContain('background-color');
    view.rerender(<EncyclopediaTile entry={entry({ image_url: null, highlight_effect: true, title_color: '#FFFFFF' })} />);
    const highlight = screen.getByRole('button').querySelector('h3 > span') as HTMLElement;
    expect(highlight.className).toBe('highlighter'); expect(highlight.style.backgroundColor).toBe('rgba(245, 245, 209, 0.7)');
  });
});
