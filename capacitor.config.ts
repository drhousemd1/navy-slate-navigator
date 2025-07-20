import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.98e56b671df649a999c2b6a9d4dcdf65',
  appName: 'navy-slate-navigator',
  webDir: 'dist',
  server: {
    url: 'https://98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;