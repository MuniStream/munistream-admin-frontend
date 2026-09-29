import type React from 'react';

/**
 * Registro genérico de renderers para tipos de campo propios de un tenant, en el
 * admin.
 *
 * El admin base no conoce los campos que emiten los operadores custom de un
 * tenant (p. ej. la revisión de facturas CFDI de CONAPESCA). En vez de acoplar
 * ese código al shared, el tenant registra aquí un renderer para su `type`;
 * `AdminDataCollectionForm` lo consulta antes de caer a sus campos nativos.
 *
 * El registro se dispara solo: los componentes override del tenant se importan al
 * arranque (glob eager en `src/overrides/index.ts`), así que basta con que el
 * `.tsx` del tenant llame `registerCustomFieldRenderer(...)` a nivel de módulo.
 *
 * A diferencia del portal ciudadano, aquí el modo por defecto es de revisión: el
 * personal normalmente VALIDA lo que capturó el ciudadano, no lo recaptura. Por
 * eso los args llevan `readOnly` (y `onChange` puede faltar): un operador puede
 * desplegar su propia UI de administración de solo lectura, o una interactiva si
 * el paso es del propio personal.
 */
export interface AdminCustomFieldRenderArgs {
  field: any;
  value: any;
  onChange?: (value: any) => void;
  readOnly?: boolean;
  disabled?: boolean;
}

export type AdminCustomFieldRenderer = (args: AdminCustomFieldRenderArgs) => React.ReactNode;

const registry: Record<string, AdminCustomFieldRenderer> = {};

export function registerCustomFieldRenderer(type: string, renderer: AdminCustomFieldRenderer): void {
  registry[type] = renderer;
}

export function getCustomFieldRenderer(type: string): AdminCustomFieldRenderer | undefined {
  return registry[type];
}
