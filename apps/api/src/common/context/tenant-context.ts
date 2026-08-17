import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  orgId: string;
  userId?: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getCurrentOrgId(): string | undefined {
  return tenantStorage.getStore()?.orgId;
}