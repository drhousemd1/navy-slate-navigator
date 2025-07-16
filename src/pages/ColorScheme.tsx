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

        <div className="grid gap-6 md:grid-cols-2">
          {COLOR_SCHEMES.map((scheme) => {
            const isActive = currentScheme === scheme.name;
            
            return (
              <Card key={scheme.name} className={`relative transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}>
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
                  {/* Labeled Color Swatches */}
                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-medium text-foreground mb-2">Color Elements</h4>
                    
                    {/* Navigation Colors */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Navigation</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: `hsl(${scheme.variables['--dark-navy']})` }}
                          />
                          <span className="text-muted-foreground">Nav Bar</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: `hsl(${scheme.variables['--nav-active']})` }}
                          />
                          <span className="text-muted-foreground">Active Item</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Colors */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Content</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: `hsl(${scheme.variables['--background']})` }}
                          />
                          <span className="text-muted-foreground">Background</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: `hsl(${scheme.variables['--card']})` }}
                          />
                          <span className="text-muted-foreground">Cards</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Colors */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Interactive</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: `hsl(${scheme.variables['--primary']})` }}
                          />
                          <span className="text-muted-foreground">Buttons</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: `hsl(${scheme.variables['--foreground']})` }}
                          />
                          <span className="text-muted-foreground">Text</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Realistic App Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Preview</h4>
                    <div 
                      className="rounded-lg border overflow-hidden"
                      style={{ borderColor: `hsl(${scheme.variables['--border']})` }}
                    >
                      {/* Mock Navigation Bar */}
                      <div 
                        className="p-2 border-b flex items-center gap-2"
                        style={{ 
                          backgroundColor: `hsl(${scheme.variables['--dark-navy']})`,
                          borderBottomColor: `hsl(${scheme.variables['--border']})`
                        }}
                      >
                        <div 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `hsl(${scheme.variables['--nav-active']})`,
                            color: `hsl(${scheme.variables['--background']})`
                          }}
                        >
                          Tasks
                        </div>
                        <div 
                          className="px-2 py-1 text-xs"
                          style={{ color: `hsl(${scheme.variables['--nav-inactive']})` }}
                        >
                          Rewards
                        </div>
                      </div>
                      
                      {/* Mock Content Area */}
                      <div 
                        className="p-3 space-y-2"
                        style={{ backgroundColor: `hsl(${scheme.variables['--background']})` }}
                      >
                        {/* Mock Task Card */}
                        <div 
                          className="p-2 rounded border"
                          style={{ 
                            backgroundColor: `hsl(${scheme.variables['--card']})`,
                            borderColor: `hsl(${scheme.variables['--border']})`
                          }}
                        >
                          <div 
                            className="text-xs font-medium mb-1"
                            style={{ color: `hsl(${scheme.variables['--foreground']})` }}
                          >
                            Sample Task
                          </div>
                          <div 
                            className="text-xs"
                            style={{ color: `hsl(${scheme.variables['--muted-foreground']})` }}
                          >
                            Task description
                          </div>
                        </div>
                        
                        {/* Mock Button */}
                        <div 
                          className="inline-block px-3 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `hsl(${scheme.variables['--primary']})`,
                            color: `hsl(${scheme.variables['--primary-foreground']})`
                          }}
                        >
                          Complete Task
                        </div>
                      </div>
                    </div>
                  </div>

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