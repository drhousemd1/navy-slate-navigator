import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.98e56b671df649a999c2b6a9d4dcdf65',
  appName: 'Navy Slate Navigator',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  ios: {
    scheme: 'Navy Slate Navigator'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;