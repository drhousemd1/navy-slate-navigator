export interface ColorScheme {
  name: string;
  description: string;
  variables: Record<string, string>;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    name: 'default',
    description: 'Original app styling - dark theme',
    variables: {
      '--background': '222.2 84% 4.9%',
      '--foreground': '210 40% 98%',
      '--sidebar-background': '240 5.9% 10%',
      '--sidebar-foreground': '240 4.8% 95.9%',
      '--sidebar-primary': '224.3 76.3% 48%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '240 3.7% 15.9%',
      '--sidebar-accent-foreground': '240 4.8% 95.9%',
      '--sidebar-border': '240 3.7% 15.9%',
      '--sidebar-ring': '217.2 91.2% 59.8%',
      '--primary': '210 40% 98%',
      '--primary-foreground': '222.2 47.4% 11.2%',
      '--secondary': '217.2 32.6% 17.5%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '217.2 32.6% 17.5%',
      '--muted-foreground': '215 20.2% 65.1%',
      '--accent': '217.2 32.6% 17.5%',
      '--accent-foreground': '210 40% 98%',
      '--card': '222.2 84% 4.9%',
      '--card-foreground': '210 40% 98%',
      '--popover': '222.2 84% 4.9%',
      '--popover-foreground': '210 40% 98%',
      '--border': '217.2 32.6% 17.5%',
      '--input': '217.2 32.6% 17.5%',
      '--ring': '212.7 26.8% 83.9%',
      '--nav-active': '189 100% 43%',
      '--nav-inactive': '215 20.2% 65.1%',
      '--dark-navy': '218 36% 13%',
      '--navy': '218 36% 18%',
      '--light-navy': '218 36% 23%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%'
    }
  },
  {
    name: 'modern-monochrome',
    description: 'Sleek black and white with silver accents',
    variables: {
      '--background': '0 0% 0%',
      '--foreground': '0 0% 98%',
      '--sidebar-background': '0 0% 4%',
      '--sidebar-foreground': '0 0% 98%',
      '--sidebar-primary': '0 0% 63%',
      '--sidebar-primary-foreground': '0 0% 9%',
      '--sidebar-accent': '210 40% 21%',
      '--sidebar-accent-foreground': '0 0% 98%',
      '--sidebar-border': '217.2 32.6% 17.5%',
      '--sidebar-ring': '0 0% 63%',
      '--primary': '0 0% 63%',
      '--primary-foreground': '0 0% 9%',
      '--secondary': '210 40% 21%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '210 40% 21%',
      '--muted-foreground': '0 0% 63%',
      '--accent': '217.2 32.6% 31.5%',
      '--accent-foreground': '0 0% 98%',
      '--card': '210 40% 21%',
      '--card-foreground': '0 0% 98%',
      '--popover': '210 40% 21%',
      '--popover-foreground': '0 0% 98%',
      '--border': '217.2 32.6% 31.5%',
      '--input': '217.2 32.6% 31.5%',
      '--ring': '0 0% 63%',
      '--nav-active': '0 0% 63%',
      '--nav-inactive': '0 0% 45%',
      '--dark-navy': '0 0% 6%',
      '--navy': '0 0% 12%',
      '--light-navy': '0 0% 20%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%'
    }
  },
  {
    name: 'light-turquoise',
    description: 'Clean white backgrounds with vibrant turquoise',
    variables: {
      '--background': '0 0% 100%',
      '--foreground': '210 40% 21%',
      '--sidebar-background': '210 40% 98%',
      '--sidebar-foreground': '210 40% 21%',
      '--sidebar-primary': '172 66% 50%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '185 96% 97%',
      '--sidebar-accent-foreground': '210 40% 21%',
      '--sidebar-border': '220 13% 91%',
      '--sidebar-ring': '172 66% 50%',
      '--primary': '172 66% 50%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '210 40% 96.1%',
      '--secondary-foreground': '210 40% 21%',
      '--muted': '210 40% 98%',
      '--muted-foreground': '215.4 16.3% 45%',
      '--accent': '185 96% 97%',
      '--accent-foreground': '210 40% 21%',
      '--card': '0 0% 100%',
      '--card-foreground': '210 40% 21%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '210 40% 21%',
      '--border': '220 13% 91%',
      '--input': '220 13% 91%',
      '--ring': '172 66% 50%',
      '--nav-active': '172 66% 50%',
      '--nav-inactive': '215.4 16.3% 45%',
      '--dark-navy': '210 40% 96%',
      '--navy': '210 40% 94%',
      '--light-navy': '220 13% 91%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%'
    }
  },
  {
    name: 'warm-sunset',
    description: 'Rich orange and brown with golden highlights',
    variables: {
      '--background': '25 45% 12%',
      '--foreground': '32 81% 91%',
      '--sidebar-background': '25 45% 8%',
      '--sidebar-foreground': '32 81% 91%',
      '--sidebar-primary': '25 95% 53%',
      '--sidebar-primary-foreground': '25 45% 12%',
      '--sidebar-accent': '25 60% 19%',
      '--sidebar-accent-foreground': '32 81% 91%',
      '--sidebar-border': '25 60% 19%',
      '--sidebar-ring': '25 95% 53%',
      '--primary': '25 95% 53%',
      '--primary-foreground': '25 45% 12%',
      '--secondary': '25 60% 19%',
      '--secondary-foreground': '32 81% 91%',
      '--muted': '25 60% 19%',
      '--muted-foreground': '25 20% 65%',
      '--accent': '25 51% 25%',
      '--accent-foreground': '32 81% 91%',
      '--card': '25 60% 19%',
      '--card-foreground': '32 81% 91%',
      '--popover': '25 60% 19%',
      '--popover-foreground': '32 81% 91%',
      '--border': '25 51% 25%',
      '--input': '25 51% 25%',
      '--ring': '25 95% 53%',
      '--nav-active': '25 95% 53%',
      '--nav-inactive': '25 20% 65%',
      '--dark-navy': '25 45% 10%',
      '--navy': '25 60% 17%',
      '--light-navy': '25 51% 25%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%'
    }
  },
  {
    name: 'forest-green',
    description: 'Deep greens with bright lime accents',
    variables: {
      '--background': '142 69% 12%',
      '--foreground': '138 76% 91%',
      '--sidebar-background': '142 69% 8%',
      '--sidebar-foreground': '138 76% 91%',
      '--sidebar-primary': '84 81% 44%',
      '--sidebar-primary-foreground': '142 69% 12%',
      '--sidebar-accent': '142 58% 19%',
      '--sidebar-accent-foreground': '138 76% 91%',
      '--sidebar-border': '142 58% 19%',
      '--sidebar-ring': '84 81% 44%',
      '--primary': '84 81% 44%',
      '--primary-foreground': '142 69% 12%',
      '--secondary': '142 58% 19%',
      '--secondary-foreground': '138 76% 91%',
      '--muted': '142 58% 19%',
      '--muted-foreground': '142 20% 65%',
      '--accent': '142 41% 25%',
      '--accent-foreground': '138 76% 91%',
      '--card': '142 58% 19%',
      '--card-foreground': '138 76% 91%',
      '--popover': '142 58% 19%',
      '--popover-foreground': '138 76% 91%',
      '--border': '142 41% 25%',
      '--input': '142 41% 25%',
      '--ring': '84 81% 44%',
      '--nav-active': '84 81% 44%',
      '--nav-inactive': '142 20% 65%',
      '--dark-navy': '142 69% 10%',
      '--navy': '142 58% 17%',
      '--light-navy': '142 41% 25%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%'
    }
  }
];

export function getColorScheme(name: string): ColorScheme | undefined {
  return COLOR_SCHEMES.find(scheme => scheme.name === name);
}

export function applyColorScheme(scheme: ColorScheme): void {
  try {
    // Mobile-safe check for document and documentElement
    if (typeof document === 'undefined' || !document.documentElement) {
      console.warn('Document not available - skipping color scheme application');
      return;
    }

    const root = document.documentElement;
    
    Object.entries(scheme.variables).forEach(([key, value]) => {
      try {
        root.style.setProperty(key, value);
      } catch (error) {
        console.warn(`Failed to set CSS property ${key}:`, error);
      }
    });
    
    console.log('Color scheme applied successfully:', scheme.name);
  } catch (error) {
    console.error('Failed to apply color scheme:', error);
  }
}