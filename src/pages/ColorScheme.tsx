import React from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useColorScheme } from '@/contexts/ColorSchemeContext';
import { COLOR_SCHEMES } from '@/lib/colorSchemes';

export default function ColorScheme() {
  const { currentScheme, applyScheme, isLoading } = useColorScheme();

  const handleApplyScheme = async (schemeName: string) => {
    await applyScheme(schemeName);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Color Schemes</h1>
          <p className="text-muted-foreground">
            Choose a color scheme to personalize your app experience. Changes apply instantly.
          </p>
        </div>

        <div className="space-y-4">
          {COLOR_SCHEMES.map((scheme) => {
            console.log('Rendering scheme:', scheme.name);
            const isActive = currentScheme === scheme.name;
            
            return (
              <Card key={scheme.name} className={`transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">
                      {scheme.name.replace('-', ' ')}
                    </CardTitle>
                    {isActive && (
                      <div className="flex items-center gap-2 text-primary">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                    )}
                  </div>
                  <CardDescription>{scheme.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <Button
                    onClick={() => handleApplyScheme(scheme.name)}
                    disabled={isLoading || isActive}
                    className="w-full"
                    variant={isActive ? "secondary" : "default"}
                  >
                    {isActive ? 'Currently Active' : 'Apply Theme'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}