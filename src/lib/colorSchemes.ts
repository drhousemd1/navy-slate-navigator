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
      '--nav-inactive': '215 20.2% 65.1%'
    }
  },
  {
    name: 'modern-monochrome',
    description: 'Sleek black and white with silver accents',
    variables: {
      '--background': '0 0 0', // Black
      '--foreground': '255 255 255', // White
      '--sidebar-background': '0 0 0',
      '--sidebar-foreground': '255 255 255',
      '--sidebar-primary': '156 163 175', // Silver
      '--sidebar-primary-foreground': '0 0 0',
      '--sidebar-accent': '31 41 55', // Dark gray
      '--sidebar-accent-foreground': '255 255 255',
      '--sidebar-border': '75 85 99',
      '--sidebar-ring': '156 163 175',
      '--primary': '156 163 175',
      '--primary-foreground': '0 0 0',
      '--secondary': '31 41 55',
      '--secondary-foreground': '255 255 255',
      '--muted': '31 41 55',
      '--muted-foreground': '156 163 175',
      '--accent': '75 85 99',
      '--accent-foreground': '255 255 255',
      '--card': '31 41 55',
      '--card-foreground': '255 255 255',
      '--popover': '31 41 55',
      '--popover-foreground': '255 255 255',
      '--border': '75 85 99',
      '--input': '75 85 99',
      '--ring': '156 163 175',
      '--nav-active': '156 163 175',
      '--nav-inactive': '107 114 128'
    }
  },
  {
    name: 'light-turquoise',
    description: 'Clean white backgrounds with vibrant turquoise',
    variables: {
      '--background': '255 255 255', // White
      '--foreground': '31 41 55', // Dark gray
      '--sidebar-background': '249 250 251', // Light gray
      '--sidebar-foreground': '31 41 55',
      '--sidebar-primary': '20 184 166', // Turquoise
      '--sidebar-primary-foreground': '255 255 255',
      '--sidebar-accent': '236 254 255', // Light turquoise
      '--sidebar-accent-foreground': '31 41 55',
      '--sidebar-border': '229 231 235',
      '--sidebar-ring': '20 184 166',
      '--primary': '20 184 166',
      '--primary-foreground': '255 255 255',
      '--secondary': '243 244 246',
      '--secondary-foreground': '31 41 55',
      '--muted': '249 250 251',
      '--muted-foreground': '107 114 128',
      '--accent': '236 254 255',
      '--accent-foreground': '31 41 55',
      '--card': '255 255 255',
      '--card-foreground': '31 41 55',
      '--popover': '255 255 255',
      '--popover-foreground': '31 41 55',
      '--border': '229 231 235',
      '--input': '229 231 235',
      '--ring': '20 184 166',
      '--nav-active': '20 184 166',
      '--nav-inactive': '107 114 128'
    }
  },
  {
    name: 'warm-sunset',
    description: 'Rich orange and brown with golden highlights',
    variables: {
      '--background': '44 25 16', // Dark brown
      '--foreground': '255 237 213', // Cream
      '--sidebar-background': '44 25 16',
      '--sidebar-foreground': '255 237 213',
      '--sidebar-primary': '251 146 60', // Orange
      '--sidebar-primary-foreground': '44 25 16',
      '--sidebar-accent': '69 39 27', // Medium brown
      '--sidebar-accent-foreground': '255 237 213',
      '--sidebar-border': '69 39 27',
      '--sidebar-ring': '251 146 60',
      '--primary': '251 146 60',
      '--primary-foreground': '44 25 16',
      '--secondary': '69 39 27',
      '--secondary-foreground': '255 237 213',
      '--muted': '69 39 27',
      '--muted-foreground': '196 181 164',
      '--accent': '92 62 37',
      '--accent-foreground': '255 237 213',
      '--card': '69 39 27',
      '--card-foreground': '255 237 213',
      '--popover': '69 39 27',
      '--popover-foreground': '255 237 213',
      '--border': '92 62 37',
      '--input': '92 62 37',
      '--ring': '251 146 60',
      '--nav-active': '251 146 60',
      '--nav-inactive': '196 181 164'
    }
  },
  {
    name: 'forest-green',
    description: 'Deep greens with bright lime accents',
    variables: {
      '--background': '20 37 26', // Dark forest green
      '--foreground': '220 252 231', // Light green
      '--sidebar-background': '20 37 26',
      '--sidebar-foreground': '220 252 231',
      '--sidebar-primary': '132 204 22', // Lime green
      '--sidebar-primary-foreground': '20 37 26',
      '--sidebar-accent': '34 53 38', // Medium green
      '--sidebar-accent-foreground': '220 252 231',
      '--sidebar-border': '34 53 38',
      '--sidebar-ring': '132 204 22',
      '--primary': '132 204 22',
      '--primary-foreground': '20 37 26',
      '--secondary': '34 53 38',
      '--secondary-foreground': '220 252 231',
      '--muted': '34 53 38',
      '--muted-foreground': '163 199 172',
      '--accent': '48 72 51',
      '--accent-foreground': '220 252 231',
      '--card': '34 53 38',
      '--card-foreground': '220 252 231',
      '--popover': '34 53 38',
      '--popover-foreground': '220 252 231',
      '--border': '48 72 51',
      '--input': '48 72 51',
      '--ring': '132 204 22',
      '--nav-active': '132 204 22',
      '--nav-inactive': '163 199 172'
    }
  }
];

export function getColorScheme(name: string): ColorScheme | undefined {
  return COLOR_SCHEMES.find(scheme => scheme.name === name);
}

export function applyColorScheme(scheme: ColorScheme): void {
  const root = document.documentElement;
  Object.entries(scheme.variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}