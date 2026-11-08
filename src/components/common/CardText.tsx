import HighlightedText from '@/components/task/HighlightedText';
import type { TextSurface } from '@/lib/customTextContrast';

/** Apply only the saved highlight and literal text color, as in the original cards. */
export default function CardText({ text, color, highlight }: {
  text: string; color: string; highlight: boolean; hasImage: boolean;
  surface: Exclude<TextSurface, 'encyclopedia-tile'>;
}) {
  return <HighlightedText text={text} highlight={highlight} color={color} />;
}
