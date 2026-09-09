/**
 * Traduce los tokens a un tema de MUI.
 *
 * Aquí está la pieza que decide si armonizar el admin cuesta una semana o un
 * mes: casi todo se consigue con `defaultProps` y `styleOverrides` globales, que
 * cambian el aspecto de lo que ya existe **sin editar una sola pantalla**. Las
 * 48 `Card` sin prop, las 38 `Paper` y los 7 tamaños distintos de spinner se
 * unifican desde este archivo, no visitando 39 componentes.
 */

import type { ThemeOptions } from '@mui/material/styles';
import { CHROME, ESTADO, NEUTRAL, RADIO, SOMBRA } from './tokens';

/** Deriva el color de texto que se lee sobre un fondo dado. */
export function contrastTextFor(hex: string): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const canal = (i: number) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
  const contrasteConBlanco = 1.05 / (L + 0.05);
  // Si el acento es claro, el blanco encima no llegaría a AA: se usa la tinta
  // oscura. Esto es lo que impide que un tenant se ponga un acento pastel y deje
  // los botones ilegibles sin que nadie lo note.
  return contrasteConBlanco >= 4.5 ? '#FFFFFF' : NEUTRAL.text;
}

/** Oscurece un color para los estados hover y pulsado. */
export function darken(hex: string, cantidad = 0.18): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const mezcla = (i: number) => {
    const v = parseInt(full.slice(i, i + 2), 16);
    return Math.round(v * (1 - cantidad)).toString(16).padStart(2, '0');
  };
  return `#${mezcla(0)}${mezcla(2)}${mezcla(4)}`;
}

/** Tiñe un color sobre blanco, para fondos de selección. */
export function tint(hex: string, cantidad = 0.08): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const mezcla = (i: number) => {
    const v = parseInt(full.slice(i, i + 2), 16);
    return Math.round(v * cantidad + 255 * (1 - cantidad)).toString(16).padStart(2, '0');
  };
  return `#${mezcla(0)}${mezcla(2)}${mezcla(4)}`;
}

/**
 * Paleta a partir del acento del tenant.
 *
 * El tenant declara **un solo color**; el resto se deriva. Antes podía declarar
 * `primary_light`, `primary_dark` y `primary_contrast_text` por separado, lo que
 * permitía combinaciones que no cumplían contraste sin que nadie lo revisara.
 */
export function buildPalette(accent: string, secondary?: string) {
  return {
    mode: 'light' as const,
    primary: {
      main: accent,
      dark: darken(accent),
      light: tint(accent),
      contrastText: contrastTextFor(accent),
    },
    ...(secondary ? { secondary: { main: secondary, contrastText: contrastTextFor(secondary) } } : {}),
    success: { main: ESTADO.success.main, contrastText: '#FFFFFF' },
    warning: { main: ESTADO.warning.main, contrastText: '#FFFFFF' },
    error: { main: ESTADO.error.main, contrastText: '#FFFFFF' },
    info: { main: ESTADO.info.main, contrastText: '#FFFFFF' },
    background: { default: NEUTRAL.app, paper: NEUTRAL.surface },
    text: {
      primary: NEUTRAL.text,
      secondary: NEUTRAL.textSecondary,
      disabled: NEUTRAL.textDisabled,
    },
    divider: NEUTRAL.border,
  };
}

/**
 * Escala tipográfica: una decisión por rol.
 *
 * Sustituye a las tres tipografías que convivían para el título de página (h4 en
 * nueve pantallas, h5 en dos, h6 en dos) y a las dos para la cifra de un KPI.
 */
export const typography = {
  fontFamily: '"Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
  h1: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.25 },
  h2: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
  h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
  /** Cifra de KPI. */
  h4: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2 },
  h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
  /** Título de bloque dentro de una página. */
  h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
  subtitle1: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 },
  body1: { fontSize: '0.9375rem', lineHeight: 1.5 },
  body2: { fontSize: '0.875rem', lineHeight: 1.5 },
  /** Etiqueta de KPI. */
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.6,
  },
  caption: { fontSize: '0.75rem', lineHeight: 1.5 },
  button: { textTransform: 'none' as const, fontWeight: 600 },
};

/** Las 25 sombras de MUI, con tinta cálida y solo tres niveles con significado. */
export const shadows = [
  SOMBRA.none,
  SOMBRA.raised,
  SOMBRA.raised,
  SOMBRA.raised,
  ...Array(21).fill(SOMBRA.overlay),
] as ThemeOptions['shadows'];

/**
 * Comportamiento por defecto y estilos globales.
 *
 * Cada entrada existe para retirar una dispersión concreta y medida; los
 * comentarios dicen cuál, porque de otro modo el archivo parece arbitrario.
 */
export function buildComponents(accent: string): ThemeOptions['components'] {
  const accentDark = darken(accent);
  const accentTint = tint(accent);

  return {
    MuiCssBaseline: {
      styleOverrides: {
        // Explícito: sin esto el navegador hereda el `color-scheme: light dark`
        // que traía la plantilla de Vite y pinta controles nativos, autofill y
        // barras de desplazamiento en oscuro sobre una interfaz clara.
        ':root': { colorScheme: 'light' },
        body: { backgroundColor: NEUTRAL.app },
        // Las cifras dejan de bailar entre filas de una tabla.
        'td, th': { fontVariantNumeric: 'tabular-nums' },
        '*:focus-visible': {
          outline: `2px solid ${accent}`,
          outlineOffset: 2,
        },
        '::selection': { backgroundColor: accentTint },
      },
    },

    // Una sola convención de superficie, en vez de las cuatro que convivían:
    // 48 Card sin prop, 38 Paper, 78 outlined y 2 elevation={3}.
    MuiCard: {
      defaultProps: { variant: 'outlined', elevation: 0 },
      styleOverrides: { root: { borderColor: NEUTRAL.border } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        outlined: { borderColor: NEUTRAL.border },
        // Lo que flota sí lleva sombra.
        elevation8: { boxShadow: SOMBRA.overlay },
      },
    },

    // La densidad estaba invertida: las pantallas de trabajo diario eran las
    // menos densas y las de configuración las más.
    MuiTable: { defaultProps: { size: 'small' } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: NEUTRAL.border },
        head: {
          backgroundColor: NEUTRAL.sunken,
          color: NEUTRAL.textSecondary,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&.MuiTableRow-hover:hover': { backgroundColor: NEUTRAL.sunken } },
      },
    },

    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: RADIO.base } },
    },
    MuiChip: { defaultProps: { size: 'small' } },

    // De siete tamaños distintos (16/20/24/28/30/40/sin prop) a uno.
    MuiCircularProgress: { defaultProps: { size: 24 } },

    MuiTooltip: { defaultProps: { arrow: true } },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: { root: { color: accentDark, fontWeight: 500 } },
    },

    // La barra deja de ser una franja de color: pasa a ser superficie con borde.
    // El color queda para las acciones, que es donde comunica algo.
    //
    // Las variables --AppBar-* son obligatorias: MUI v7 pinta la barra con
    // `background-color: var(--AppBar-background)` y, si nadie la define, la
    // barra queda transparente y el contenido se ve pasar por debajo al hacer
    // scroll.
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'default' },
      styleOverrides: {
        root: {
          '--AppBar-background': NEUTRAL.surface,
          '--AppBar-color': NEUTRAL.text,
          backgroundColor: NEUTRAL.surface,
          color: NEUTRAL.text,
          borderBottom: `1px solid ${NEUTRAL.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: NEUTRAL.surface, borderRight: `1px solid ${NEUTRAL.border}` },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: RADIO.base,
          '&.Mui-selected': {
            backgroundColor: accentTint,
            color: accentDark,
            '& .MuiListItemIcon-root': { color: accentDark },
            '&:hover': { backgroundColor: accentTint },
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 2, backgroundColor: accent } },
    },

    // Los estados van suaves, con texto oscuro. Es lo que impide que un aviso se
    // confunda con un botón: el acento es sólido y los estados nunca lo son.
    MuiAlert: {
      defaultProps: { variant: 'standard' },
      styleOverrides: {
        standardSuccess: { backgroundColor: ESTADO.success.soft, color: ESTADO.success.onSoft },
        standardWarning: { backgroundColor: ESTADO.warning.soft, color: ESTADO.warning.onSoft },
        standardError: { backgroundColor: ESTADO.error.soft, color: ESTADO.error.onSoft },
        standardInfo: { backgroundColor: ESTADO.info.soft, color: ESTADO.info.onSoft },
        root: { borderRadius: RADIO.base },
      },
    },

    MuiDialog: { defaultProps: { PaperProps: { elevation: 8 } } },
    MuiMenu: { defaultProps: { elevation: 8 } },
    MuiPopover: { defaultProps: { elevation: 8 } },
  };
}

/** Variables CSS propias, para lo que no pasa por MUI. */
export function cssVariables(accent: string): Record<string, string> {
  return {
    '--ms-accent': accent,
    '--ms-accent-dark': darken(accent),
    '--ms-surface': NEUTRAL.surface,
    '--ms-app-bg': NEUTRAL.app,
    '--ms-border': NEUTRAL.border,
    '--ms-text': NEUTRAL.text,
    '--ms-text-secondary': NEUTRAL.textSecondary,
    // No es cosmética: la cabecera del expediente se ancla a la altura de la
    // barra, y hasta ahora ese valor estaba escrito a mano en dos sitios.
    '--ms-appbar-h': `${CHROME.appBarHeight}px`,
    '--ms-appbar-h-xs': `${CHROME.appBarHeightXs}px`,
    '--ms-drawer-w': `${CHROME.drawerWidth}px`,
    '--ms-content-max': `${CHROME.contentMaxWidth}px`,
  };
}
