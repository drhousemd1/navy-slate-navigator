import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { COLOR_SCHEMES, ColorScheme, applyColorScheme, getColorScheme } from '@/lib/colorSchemes';

interface ColorSchemeContextType {
  currentScheme: string;
  applyScheme: (schemeName: string) => Promise<void>;
  isLoading: boolean;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
}

interface ColorSchemeProviderProps {
  children: ReactNode;
}

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const { user } = useAuth();
  const [currentScheme, setCurrentScheme] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Load user's color scheme preference on mount
  useEffect(() => {
    async function loadColorScheme() {
      try {
        console.log('Loading color scheme for user:', user?.id || 'anonymous');
        
        if (!user) {
          // For unauthenticated users, load from localStorage or use default
          const saved = localStorage.getItem('color-scheme');
          const scheme = saved || 'default';
          const schemeConfig = getColorScheme(scheme);
          if (schemeConfig) {
            applyColorScheme(schemeConfig);
            setCurrentScheme(scheme);
            console.log('Applied saved color scheme:', scheme);
          }
          setIsLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase
            .from('user_color_schemes')
            .select('scheme_name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Error loading color scheme:', error);
            throw error;
          }

          const schemeName = data?.scheme_name || 'default';
          const scheme = getColorScheme(schemeName);
          
          if (scheme) {
            applyColorScheme(scheme);
            setCurrentScheme(schemeName);
            console.log('Applied user color scheme:', schemeName);
          }
        } catch (error) {
          console.error('Database error loading color scheme:', error);
          // Fallback to default scheme
          const defaultScheme = getColorScheme('default');
          if (defaultScheme) {
            applyColorScheme(defaultScheme);
            setCurrentScheme('default');
            console.log('Applied fallback default color scheme');
          }
        }
      } catch (error) {
        console.error('Critical error in color scheme loading:', error);
        setHasError(true);
        // Apply default scheme as absolute fallback
        try {
          const defaultScheme = getColorScheme('default');
          if (defaultScheme) {
            applyColorScheme(defaultScheme);
            setCurrentScheme('default');
          }
        } catch (fallbackError) {
          console.error('Even fallback failed:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadColorScheme();
  }, [user]);

  const applyScheme = async (schemeName: string) => {
    try {
      console.log('Applying color scheme:', schemeName);
      const scheme = getColorScheme(schemeName);
      if (!scheme) {
        console.warn('Color scheme not found:', schemeName);
        return;
      }

      // Apply the color scheme immediately
      applyColorScheme(scheme);
      setCurrentScheme(schemeName);

      if (user) {
        // Save to database for authenticated users
        try {
          const { error } = await supabase
            .from('user_color_schemes')
            .upsert({
              user_id: user.id,
              scheme_name: schemeName,
            });

          if (error) {
            console.error('Error saving color scheme:', error);
          } else {
            console.log('Color scheme saved to database:', schemeName);
          }
        } catch (error) {
          console.error('Database error saving color scheme:', error);
        }
      } else {
        // Save to localStorage for unauthenticated users
        try {
          localStorage.setItem('color-scheme', schemeName);
          console.log('Color scheme saved to localStorage:', schemeName);
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      }
    } catch (error) {
      console.error('Error in applyScheme:', error);
      setHasError(true);
    }
  };

  // If there's a critical error, still provide a working context
  if (hasError) {
    console.warn('ColorSchemeProvider in error state, providing fallback');
  }

  return (
    <ColorSchemeContext.Provider
      value={{
        currentScheme: hasError ? 'default' : currentScheme,
        applyScheme: hasError ? async () => {} : applyScheme,
        isLoading: hasError ? false : isLoading,
      }}
    >
      {children}
    </ColorSchemeContext.Provider>
  );
}