import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useColorScheme } from '@/contexts/ColorSchemeContext';
import { COLOR_SCHEMES } from '@/lib/colorSchemes';

export default function ColorScheme() {
  const navigate = useNavigate();
  const { currentScheme, applyScheme, isLoading, isSaving, pendingScheme, error, retry, canApply } = useColorScheme();

  const handleApplyScheme = async (schemeName: string) => {
    await applyScheme(schemeName);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Color Schemes</h1>
          <p className="text-muted-foreground">
            Choose a color scheme to personalize your app experience. Changes apply after they are saved.
          </p>
        </div>

        {isLoading && <p role="status" className="mb-4 text-muted-foreground">Loading your saved theme...</p>}
        {error && (
          <div role="alert" className="mb-4 space-y-2 text-foreground">
            <p>{error.message}</p>
            {error.kind === 'load' && <Button onClick={() => void retry()}>Retry loading theme</Button>}
          </div>
        )}

        <div className="space-y-4">
          {COLOR_SCHEMES.map((scheme) => {
            const isActive = currentScheme === scheme.name;
            const isPending = pendingScheme === scheme.name;
            const retrySave = error?.kind === 'save' && isPending;
            
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
                
                <CardContent className="space-y-4">
                  {/* Color Preview Boxes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="w-4 h-4 rounded border" style={{ backgroundColor: `hsl(${scheme.variables['--sidebar-background']})` }}></div>
                      <span className="text-xs text-muted-foreground">Navigation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="w-4 h-4 rounded border" style={{ backgroundColor: `hsl(${scheme.variables['--card']})` }}></div>
                      <span className="text-xs text-muted-foreground">Cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="w-4 h-4 rounded border" style={{ backgroundColor: `hsl(${scheme.variables['--primary']})` }}></div>
                      <span className="text-xs text-muted-foreground">Buttons</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="w-4 h-4 rounded border" style={{ backgroundColor: `hsl(${scheme.variables['--foreground']})` }}></div>
                      <span className="text-xs text-muted-foreground">Title Text</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="w-4 h-4 rounded border" style={{ backgroundColor: `hsl(${scheme.variables['--muted-foreground']})` }}></div>
                      <span className="text-xs text-muted-foreground">Subtext</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="w-4 h-4 rounded border" style={{ backgroundColor: `hsl(${scheme.variables['--muted']})` }}></div>
                      <span className="text-xs text-muted-foreground">Backgrounds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="w-4 h-4 rounded border" style={{ backgroundColor: `hsl(${scheme.variables['--accent']})` }}></div>
                      <span className="text-xs text-muted-foreground">Accents</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => void (retrySave ? retry() : handleApplyScheme(scheme.name))}
                    disabled={isLoading || isSaving || isActive || (!canApply && !retrySave)}
                    className="w-full"
                    variant={isActive ? "secondary" : "default"}
                  >
                    {isPending && isSaving ? 'Saving...' : retrySave ? 'Retry saving theme' : isActive ? 'Currently Active' : 'Apply Theme'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => navigate('/')}
            variant="default"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Close & Return Home
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}