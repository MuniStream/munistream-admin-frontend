import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

interface ThemeColors {
  primary_main: string;
  primary_light?: string;
  primary_dark?: string;
  primary_contrast_text?: string;
  secondary_main?: string;
  secondary_light?: string;
  secondary_dark?: string;
  secondary_contrast_text?: string;
  background_default?: string;
  background_paper?: string;
  text_primary?: string;
  text_secondary?: string;
  text_disabled?: string;
  error?: string;
  warning?: string;
  info?: string;
  success?: string;
  custom?: Record<string, string>;
}

interface ThemeTypography {
  font_family?: string;
  font_family_headings?: string;
  font_size_base?: number;
  font_size_small?: number;
  font_size_large?: number;
  font_weight_light?: number;
  font_weight_regular?: number;
  font_weight_medium?: number;
  font_weight_bold?: number;
}

interface ThemeConfig {
  metadata?: {
    name: string;
    organization?: string;
    tenant_id?: string;
  };
  colors: ThemeColors;
  typography?: ThemeTypography;
  spacing?: {
    unit?: number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  borders?: {
    radius_sm?: number;
    radius_md?: number;
    radius_lg?: number;
  };
  components?: Record<string, any>;
  assets?: {
    logo?: string;
    favicon?: string;
    background_image?: string;
  };
}

interface ThemeContextType {
  theme: Theme;
  themeConfig: ThemeConfig | null;
  isLoading: boolean;
  error: Error | null;
  reloadTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default theme fallback
const defaultThemeConfig: ThemeConfig = {
  colors: {
    primary_main: '#1976d2',
    secondary_main: '#dc004e',
    background_default: '#ffffff',
    background_paper: '#f5f5f5',
  },
};

declare global {
  interface Window {
    __THEME_CONFIG__?: ThemeConfig;
  }
}

const THEME_URL = '/themes/theme-config.json';

/**
 * Theme injected into index.html by load-theme.sh at container start.
 *
 * This is the normal path in a deployed container: the tenant theme is already
 * in the document, so it applies on the very first render — no network request,
 * no flash of the default palette, and no race with the Keycloak bootstrap
 * (which navigates the document and would cancel an in-flight fetch).
 *
 * Absent under the Vite dev server, where the fetch fallback takes over.
 */
function readInjectedThemeConfig(): ThemeConfig | null {
  if (typeof window === 'undefined') return null;
  const injected = window.__THEME_CONFIG__;
  if (!injected || typeof injected !== 'object' || !injected.colors) return null;
  return injected;
}

/**
 * Fetch the theme, distinguishing the three ways this can fail so a broken
 * deployment is diagnosable from the console instead of surfacing as one
 * generic message.
 */
async function fetchThemeConfig(signal: AbortSignal): Promise<ThemeConfig> {
  const response = await fetch(THEME_URL, { signal });

  if (!response.ok) {
    throw new Error(`${THEME_URL} responded ${response.status} ${response.statusText}`);
  }

  // A missing theme file used to be served as index.html with HTTP 200 by the
  // SPA fallback, which surfaced as an opaque JSON syntax error. nginx now
  // returns a real 404, but keep the check: it also covers dev servers and
  // any proxy in front that reintroduces the fallback.
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();
  if (contentType.includes('text/html') || body.trimStart().startsWith('<')) {
    throw new Error(
      `${THEME_URL} returned HTML instead of JSON — the theme file is missing ` +
        `from the container (check load-theme.sh output)`
    );
  }

  try {
    return JSON.parse(body) as ThemeConfig;
  } catch {
    throw new Error(`${THEME_URL} is not valid JSON`);
  }
}

function wasAborted(err: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (err instanceof Error && err.name === 'AbortError');
}

/** Everything the theme changes outside React state. */
function applyThemeSideEffects(config: ThemeConfig) {
  if (config.metadata?.organization) {
    document.title = `${config.metadata.organization} - Admin Portal`;
  }

  // load-theme.sh drops assets entries whose file is not shipped, so reaching
  // here means the asset exists.
  if (config.assets?.favicon) {
    const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = `/themes/assets/${config.assets.favicon}`;
    }
  }
}

function createMuiTheme(config: ThemeConfig): Theme {
  const { colors, typography, spacing, borders, components } = config;

  return createTheme({
    palette: {
      primary: {
        main: colors.primary_main,
        light: colors.primary_light,
        dark: colors.primary_dark,
        contrastText: colors.primary_contrast_text,
      },
      secondary: colors.secondary_main ? {
        main: colors.secondary_main,
        light: colors.secondary_light,
        dark: colors.secondary_dark,
        contrastText: colors.secondary_contrast_text,
      } : undefined,
      background: {
        default: colors.background_default || '#ffffff',
        paper: colors.background_paper || '#f5f5f5',
      },
      text: {
        primary: colors.text_primary || '#000000',
        secondary: colors.text_secondary || '#666666',
        disabled: colors.text_disabled || '#999999',
      },
      ...(colors.error && { error: { main: colors.error } }),
      ...(colors.warning && { warning: { main: colors.warning } }),
      ...(colors.info && { info: { main: colors.info } }),
      ...(colors.success && { success: { main: colors.success } }),
    },
    typography: typography ? {
      fontFamily: typography.font_family,
      fontSize: typography.font_size_base,
      fontWeightLight: typography.font_weight_light,
      fontWeightRegular: typography.font_weight_regular,
      fontWeightMedium: typography.font_weight_medium,
      fontWeightBold: typography.font_weight_bold,
      h1: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h2: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h3: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h4: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h5: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h6: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
    } : undefined,
    spacing: spacing?.unit,
    shape: borders ? {
      borderRadius: borders.radius_md || 4,
    } : undefined,
    components: components || {},
  });
}

// Applied at module evaluation, before React renders anything, so the document
// title and favicon are already correct when the first content is painted.
const injectedConfigAtLoad = readInjectedThemeConfig();
if (injectedConfigAtLoad) {
  applyThemeSideEffects(injectedConfigAtLoad);
}

export function CustomThemeProvider({ children }: { children: ReactNode }) {
  // Read the injected theme synchronously so the tenant palette is in place on
  // the first render rather than after a round trip.
  const injectedConfig = injectedConfigAtLoad;

  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(injectedConfig);
  const [theme, setTheme] = useState<Theme>(() => {
    if (injectedConfig) {
      try {
        return createMuiTheme(injectedConfig);
      } catch (err) {
        console.error('Theme is invalid, falling back to the default palette:', err);
      }
    }
    return createMuiTheme(defaultThemeConfig);
  });
  const [isLoading, setIsLoading] = useState(!injectedConfig);
  const [error, setError] = useState<Error | null>(null);

  const applyConfig = (config: ThemeConfig) => {
    // createTheme throws on a malformed colour (e.g. a CSS keyword or a
    // gradient where MUI expects a hex/rgb value). Keep that separate from a
    // transport failure so the console says which one it was.
    let nextTheme: Theme;
    try {
      nextTheme = createMuiTheme(config);
    } catch (err) {
      console.error('Theme loaded but could not be applied — check the colours in theme.yaml:', err);
      setError(err as Error);
      return;
    }
    setThemeConfig(config);
    setTheme(nextTheme);
    applyThemeSideEffects(config);
    setError(null);
  };

  const [reloadToken, setReloadToken] = useState(0);
  const reloadTheme = () => setReloadToken((n) => n + 1);

  useEffect(() => {
    // Injected path: side effects already ran at module load, nothing to fetch.
    if (injectedConfig && reloadToken === 0) {
      setIsLoading(false);
      return;
    }

    // Fallback path (Vite dev server, or an image built before the injection
    // existed). Retry: the first attempt can be cancelled by the navigation
    // that the Keycloak bootstrap performs, and a cancelled request is not a
    // failure worth reporting.
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const delays = [0, 150, 400];
      let lastError: unknown;

      for (const delay of delays) {
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        if (cancelled || controller.signal.aborted) return;
        try {
          const config = await fetchThemeConfig(controller.signal);
          if (cancelled) return;
          applyConfig(config);
          setIsLoading(false);
          return;
        } catch (err) {
          if (wasAborted(err, controller.signal)) return;
          lastError = err;
        }
      }

      if (cancelled) return;
      console.error('Failed to load theme after 3 attempts:', lastError);
      setError(lastError as Error);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadToken]);

  const contextValue: ThemeContextType = {
    theme,
    themeConfig,
    isLoading,
    error,
    reloadTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
}