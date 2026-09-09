import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'badge-success',
    inactive: 'badge-neutral',
    suspended: 'badge-danger',
    draft: 'badge-warning',
    finalized: 'badge-info',
    amended: 'badge-warning',
    open: 'badge-info',
    in_progress: 'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-danger',
    waiting: 'badge-warning',
    called: 'badge-info',
    in_service: 'badge-success',
    dispensed: 'badge-success',
    expired: 'badge-neutral',
    revoked: 'badge-danger',
    pending: 'badge-warning',
    accepted: 'badge-success',
    investigating: 'badge-warning',
    resolved: 'badge-success',
    closed: 'badge-neutral',
    success: 'badge-success',
    failure: 'badge-danger',
    scheduled: 'badge-info',
    missed: 'badge-danger',
    rejected: 'badge-danger',
  };
  return colors[status] || 'badge-neutral';
}
