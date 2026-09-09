import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Qué muestra la barra superior en cada momento.
 *
 * La barra decía siempre lo mismo —«Panel de administración MuniStream»— y justo
 * debajo cada página repetía su propio título. Eran dos franjas de encabezado
 * apiladas, y la de arriba no aportaba nada específico: la identidad ya está en
 * el menú lateral.
 *
 * Ahora la barra muestra el título real de la sección y sus acciones, y las
 * páginas dejan de encabezarse solas.
 */
export interface PageChrome {
  title: string;
  subtitle?: ReactNode;
  /** Acciones propias de la página, alineadas a la derecha de la barra. */
  actions?: ReactNode;
}

interface PageChromeContextValue {
  chrome: PageChrome;
  setChrome: (chrome: PageChrome) => void;
}

const Ctx = createContext<PageChromeContextValue | undefined>(undefined);

export function PageChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<PageChrome>({ title: '' });

  // Estable, para que las páginas puedan llamarlo desde un efecto sin provocar
  // un ciclo de actualización.
  const setChrome = useCallback((next: PageChrome) => {
    setChromeState((prev) =>
      prev.title === next.title && prev.subtitle === next.subtitle && prev.actions === next.actions
        ? prev
        : next,
    );
  }, []);

  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageChrome(): PageChromeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePageChrome fuera de PageChromeProvider');
  return ctx;
}
