
import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppAssetGenerator } from '@/components/mobile/AppAssetGenerator';
import { Card } from '@/components/ui/card';
import { Smartphone, Apple, PlayCircle, Globe } from 'lucide-react';

const AppStorePrep = () => {
  // Use the current app logo
  const logoUrl = '/lovable-uploads/dcc2780c-ff8b-4d04-85f0-aef8a8ea62d8.png';

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">App Store Preparation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate all the required assets for publishing your app to iOS App Store, Google Play Store, 
            and Progressive Web App platforms.
          </p>
        </div>

        <AppAssetGenerator logoUrl={logoUrl} />

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 text-center space-y-4">
            <Apple className="w-12 h-12 mx-auto text-blue-500" />
            <h3 className="text-lg font-semibold">iOS App Store</h3>
            <p className="text-sm text-muted-foreground">
              Generates all required icon sizes from 20px to 1024px and splash screens for various iPhone and iPad sizes.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4">
            <PlayCircle className="w-12 h-12 mx-auto text-green-500" />
            <h3 className="text-lg font-semibold">Google Play Store</h3>
            <p className="text-sm text-muted-foreground">
              Creates Android-specific icons for different densities (LDPI to XXXHDPI) and splash screens.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4">
            <Globe className="w-12 h-12 mx-auto text-purple-500" />
            <h3 className="text-lg font-semibold">Progressive Web App</h3>
            <p className="text-sm text-muted-foreground">
              Generates PWA manifest icons (192px and 512px) for web app installation.
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Next Steps After Generating Assets</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">1</div>
              <div>
                <strong>Download the generated assets</strong> - Use the platform-specific buttons to download only what you need.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">2</div>
              <div>
                <strong>Export your project to GitHub</strong> - Use the "Export to GitHub" button in Lovable to get your complete project.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">3</div>
              <div>
                <strong>Set up native platforms</strong> - Run <code className="bg-muted px-1 rounded">npx cap add ios</code> and <code className="bg-muted px-1 rounded">npx cap add android</code> in your local project.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">4</div>
              <div>
                <strong>Replace the default icons</strong> - Copy the generated assets to the appropriate platform directories in your project.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">5</div>
              <div>
                <strong>Build and deploy</strong> - Follow platform-specific guidelines to build and submit your app to the stores.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AppStorePrep;
