import { useColorScheme } from '@/contexts/ColorSchemeContext';

/** Keep the established dark-palette colors. Small text on the light panels
 * needs foreground: that palette's muted token is only suitable for large icons. */
export function useCoreTextClasses() {
  const light = useColorScheme().currentScheme === 'light-turquoise';
  return {
    primary: light ? 'text-foreground' : 'text-white',
    field: light ? 'text-foreground placeholder:text-foreground' : 'text-white',
    secondary: light ? 'text-foreground' : 'text-gray-300',
    subtle: light ? 'text-foreground' : 'text-light-navy',
    muted: light ? 'text-foreground' : 'text-muted-foreground',
    danger: light ? 'text-foreground' : 'text-red-300',
    warning: light ? 'text-foreground' : 'text-amber-300',
  };
}
