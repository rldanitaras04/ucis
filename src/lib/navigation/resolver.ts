import { NavigationItem, NavigationSection, AuthorizationContext } from './types';
import { NAVIGATION_REGISTRY } from './registry';

function isItemAuthorized(
  item: NavigationItem,
  ctx: AuthorizationContext
): boolean {
  const isSuperAdmin = ctx.roles.includes('super_admin');

  if (item.requiredRoles && item.requiredRoles.length > 0) {
    if (!isSuperAdmin) {
      const hasRole = item.requiredRoles.some(role =>
        ctx.roles.includes(role)
      );
      if (!hasRole) return false;
    }
  }

  if (item.requiredPermissions && item.requiredPermissions.length > 0) {
    if (!isSuperAdmin) {
      const hasPerm = item.requiredPermissions.some(perm =>
        ctx.permissions.includes(perm)
      );
      if (!hasPerm) return false;
    }
  }

  if (item.requiresProvider && !ctx.provider) {
    if (!isSuperAdmin) return false;
  }

  if (item.providerTypes && item.providerTypes.length > 0) {
    if (!isSuperAdmin && ctx.provider) {
      if (!item.providerTypes.includes(ctx.provider.type)) {
        return false;
      }
    }
  }

  if (item.requiresPatientLink && !ctx.patient) {
    if (!isSuperAdmin) return false;
  }

  return true;
}

export function resolveNavigation(
  ctx: AuthorizationContext
): NavigationSection[] {
  const authorized = NAVIGATION_REGISTRY.filter(item =>
    isItemAuthorized(item, ctx)
  ).sort((a, b) => a.priority - b.priority);

  const sectionMap = new Map<string, NavigationItem[]>();

  for (const item of authorized) {
    const existing = sectionMap.get(item.section) || [];
    existing.push(item);
    sectionMap.set(item.section, existing);
  }

  const sections: NavigationSection[] = [];
  const sectionOrder = [
    'Overview',
    'Clinical',
    'Pharmacy',
    'Documents',
    'Analytics',
    'Administration',
    'AI',
  ];

  for (const sectionId of sectionOrder) {
    const items = sectionMap.get(sectionId);
    if (items && items.length > 0) {
      sections.push({
        id: sectionId,
        label: sectionId,
        items,
      });
    }
  }

  return sections;
}
