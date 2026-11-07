import { getColorScheme } from '@/lib/colorSchemes';

type RGB = [number, number, number];
function fromHsl(value: string): RGB {
  const [h, s, l] = value.split(' ').map(Number.parseFloat);
  const saturation = s / 100, lightness = l / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => { const k = (n + h / 30) % 12; return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [channel(0), channel(8), channel(4)];
}
function fromHex(value: string): { rgb: RGB; alpha: number } | null {
  if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return null;
  let hex = value.slice(1); if (hex.length <= 4) hex = [...hex].map(char => char + char).join('');
  return { rgb: [0, 2, 4].map(start => Number.parseInt(hex.slice(start, start + 2), 16) / 255) as RGB,
    alpha: hex.length === 8 ? Number.parseInt(hex.slice(6), 16) / 255 : 1 };
}
function luminance(rgb: RGB) {
  const channels = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(text: { rgb: RGB; alpha: number }, background: RGB) {
  const foreground = text.rgb.map((channel, i) => channel * text.alpha + background[i] * (1 - text.alpha)) as RGB;
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Local aid for explicit saved text on known image-free surfaces; never changes saved colors. */
export type TextSurface = '--card' | '--dark-navy' | '--navy' | 'encyclopedia-tile';

export function customTextBacking({ color, schemeName, hasImage, highlight, surface }: {
  color: string | null | undefined; schemeName: string; hasImage: boolean; highlight: boolean; surface: TextSurface;
}): string | undefined {
  if (!color || hasImage || highlight) return undefined;
  const text = fromHex(color); if (!text) return undefined;
  const palette = getColorScheme(schemeName) ?? getColorScheme('default')!;
  const base = fromHsl(palette.variables[surface === 'encyclopedia-tile' ? '--navy' : surface]);
  const backgrounds = [base];
  if (surface === 'encyclopedia-tile') {
    const dark = fromHsl(palette.variables['--dark-navy']);
    // Existing tile gradient runs from a 90% dark-navy overlay to transparent.
    backgrounds.push(dark.map((channel, i) => channel * 0.9 + base[i] * 0.1) as RGB);
  }
  const originalNavy = getColorScheme('default')!.variables['--dark-navy'];
  // Dark custom text must never receive a dark backing that makes it worse.
  if (backgrounds.some(background => contrast(text, background) < 4.5) && contrast(text, fromHsl(originalNavy)) >= 4.5)
    return `hsl(${originalNavy})`;
  return undefined;
}
