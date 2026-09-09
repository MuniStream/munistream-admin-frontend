/**
 * Tokens del sistema visual del admin.
 *
 * Un único sitio donde vive el color. Todo lo demás —componentes, páginas,
 * gráficas— consume de aquí; ningún archivo de interfaz debería volver a
 * escribir un hex.
 *
 * Dos ideas sostienen la paleta:
 *
 * 1. **Cromo neutro, color reservado.** La interfaz es casi monócroma en grises
 *    cálidos; el color solo aparece en acciones, estados y lo seleccionado. Así
 *    cada organismo puede poner su acento sin que la herramienta cambie de
 *    carácter, y sin que dos colores institucionales peleen en la misma
 *    pantalla.
 *
 * 2. **La identidad ya existía, solo estaba mal transcrita.** Los portales
 *    ciudadanos usaban `#9d2449` y `#9F2149` para el mismo guinda, y ninguno de
 *    los dos es el del Manual de Identidad Gráfica del Gobierno de México. Aquí
 *    se unifica en el oficial.
 */

/** Guinda, verde y dorado del Manual de Identidad Gráfica del Gobierno de México. */
export const INSTITUCIONAL = {
  guinda: '#9F2241',
  verde: '#235B4E',
  dorado: '#BC955C',
} as const;

/**
 * Neutra cálida (matiz ~30-40°, croma casi nulo).
 *
 * Es deliberadamente cálida: un gris azulado como el `#f5f5f5` que había antes
 * hace que el guinda se vea sucio al lado. Los contrastes anotados son sobre
 * blanco y están calculados, no estimados.
 */
export const NEUTRAL = {
  /** Fondo de la aplicación. */
  app: '#F7F6F4',
  /** Tarjetas, tablas, barra superior, menú lateral. */
  surface: '#FFFFFF',
  /** Cabecera de tabla, zonas hundidas, hover de fila. */
  sunken: '#F1EFEC',
  /** Divisores y borde de tarjeta. Decorativo: no transporta significado. */
  border: '#E7E4DF',
  /** Contorno de control (input, casilla). 3.82:1 — cumple 1.4.11. */
  borderStrong: '#8A817A',
  /** Texto y títulos. 17.5:1 */
  text: '#1C1917',
  /** Etiquetas y texto secundario. 7.6:1 */
  textSecondary: '#57534E',
  /**
   * Deshabilitado. 5.2:1
   *
   * Sustituye al `#999999` anterior, que daba 2.85:1 y no cumplía AA — con
   * `body2 color="text.secondary"` usado 176 veces, era el fallo de contraste
   * de mayor superficie del producto.
   */
  textDisabled: '#736B62',
} as const;

/**
 * Estados.
 *
 * Se abandonan el rojo, verde y naranja de Material: sobre la neutra cálida se
 * ven estridentes, y su rojo compite con el acento. El "información" usa el
 * verde institucional, que además resuelve el estado sin recurrir al azul.
 */
export const ESTADO = {
  success: { main: '#2E6B4F', soft: '#EAF3EE', onSoft: '#215240' },
  warning: { main: '#8A5300', soft: '#FBF0DC', onSoft: '#7A4A00' },
  error: { main: '#A02B12', soft: '#FCEDE9', onSoft: '#8A2410' },
  info: { main: INSTITUCIONAL.verde, soft: '#E6F0ED', onSoft: '#17463B' },
  neutral: { main: '#6B6560', soft: NEUTRAL.sunken, onSoft: '#4A4540' },
} as const;

/**
 * Series de gráfica.
 *
 * Ordenadas por luminancia descendente, no por gusto: así se distinguen también
 * en escala de grises y al imprimir, que es como acaban muchos informes. Todas
 * llegan a 3:1 sobre blanco.
 *
 * Sustituye a las dos paletas incompatibles que había: la de ejemplo de recharts
 * (cuyo amarillo daba 1.7:1) y una copia a mano de la de Material.
 */
export const CHART_PALETTE = [
  '#611232', // guinda oscuro
  '#235B4E', // verde institucional
  '#A0472F', // terracota
  '#4A7C59', // verde salvia
  '#C4703F', // naranja tostado
  '#B08A4E', // dorado profundo
] as const;

/** Para el resto/otros de una gráfica: solo con trazo, nunca relleno solo. */
export const CHART_MUTED = '#A8A199';

/**
 * Escala de espaciado, en unidades de `theme.spacing` (8px).
 *
 * La dispersión que sustituye: 21 valores fraccionarios sueltos y saltos a 6 y 8
 * sin criterio.
 */
export const ESPACIADO = {
  xs: 0.5, // 4px
  sm: 1, // 8px
  md: 2, // 16px
  lg: 3, // 24px
  xl: 4, // 32px
} as const;

/** Radios. Antes había 8 valores distintos conviviendo. */
export const RADIO = {
  base: 8,
  pill: 999,
} as const;

/** Ancho del menú lateral y alto de la barra, en píxeles. */
export const CHROME = {
  drawerWidth: 240,
  appBarHeight: 64,
  appBarHeightXs: 56,
  contentMaxWidth: 1440,
} as const;

/**
 * Sombras con tinta cálida.
 *
 * El negro puro de Material se ve grisáceo y frío sobre esta neutra. Solo hay
 * tres niveles con significado: plano para lo que está en el flujo, apenas una
 * sombra para la cabecera pegajosa, y sombra marcada para lo que de verdad
 * flota (menús, diálogos, paneles laterales).
 */
export const SOMBRA = {
  none: 'none',
  raised: '0 1px 2px rgba(28,25,23,0.08)',
  overlay: '0 8px 24px rgba(28,25,23,0.14)',
} as const;
