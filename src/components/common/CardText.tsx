import HighlightedText from '@/components/task/HighlightedText';
import { useColorScheme } from '@/contexts/ColorSchemeContext';
import { customTextBacking, type TextSurface } from '@/lib/customTextContrast';

/** The saved color stays literal. Only eligible text receives a local backing. */
export default function CardText({ text, color, highlight, hasImage, surface }: {
  text: string; color: string; highlight: boolean; hasImage: boolean;
  surface: Exclude<TextSurface, 'encyclopedia-tile'>;
}) {
  const { currentScheme } = useColorScheme();
  // This correction is for the light palette; preserve all four dark card appearances.
  const backgroundColor = currentScheme === 'light-turquoise'
    ? customTextBacking({ color, highlight, hasImage, surface, schemeName: currentScheme }) : undefined;
  const content = <HighlightedText text={text} highlight={highlight} color={color} />;
  return backgroundColor ? <span style={{ backgroundColor, padding: '1px 4px', borderRadius: '4px',
    boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{content}</span> : content;
}
