import type React from 'react';

/**
 * Carga los componentes override del tenant.
 *
 * `refresh-admin.sh` copia aquí los `.tsx` de
 * `tenants/<tenant>/themes/admin/components/` antes de compilar (y los borra al
 * terminar). El glob eager los importa al arranque, de modo que el código de
 * módulo de cada override corre —incluido su `registerCustomFieldRenderer(...)`—
 * sin que el admin base tenga que conocerlos.
 */
const modules = import.meta.glob<{ default?: React.FC }>('./*.tsx', { eager: true });

const overrides: Record<string, React.FC> = {};
for (const [path, module] of Object.entries(modules)) {
  const name = path.replace('./', '').replace('.tsx', '');
  if (module.default) {
    overrides[name] = module.default;
  }
}

export function getOverride(name: string): React.FC | undefined {
  return overrides[name];
}
