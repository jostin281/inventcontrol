/**
 * Quita del body de un PATCH/PUT los campos que nunca deberían poder
 * modificarse desde el cliente (el "dueño" del registro y su id). Sin esto,
 * un usuario autenticado podría mandar `companyId` en el body y mover un
 * registro a otra empresa, ya que los controllers reciben `data: any` sin
 * un DTO que filtre las propiedades.
 */
export function sanitizeUpdate<T extends Record<string, any>>(
  data: T,
  extraForbiddenKeys: string[] = [],
): Partial<T> {
  const clean = { ...data };
  for (const key of ['id', 'companyId', ...extraForbiddenKeys]) {
    delete (clean as any)[key];
  }
  return clean;
}
