export type NotificationPriority = 'info' | 'success' | 'warning' | 'high' | 'critical';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationDeliveryStatus = 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'skipped';

export interface Notification {
  id: string;
  user_id: string;
  actor_user_id?: string;
  title: string;
  body?: string;
  notification_type: string;
  priority: NotificationPriority;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  deduplication_key?: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  event_type: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_agent?: string;
  created_at: string;
  last_used_at?: string;
  revoked_at?: string;
}

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attempt_count: number;
  provider_message_id?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPayload {
  userId: string;
  actorUserId?: string;
  title: string;
  body?: string;
  eventType: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  deduplicationKey?: string;
  expiresAt?: string;
}

export const NOTIFICATION_EVENTS = {
  PATIENT_REGISTERED: 'patient.registered',
  TRIAGE_COMPLETED: 'patient.triage.completed',
  MEDICAL_RECORD_CREATED: 'medical_record.created',
  MEDICAL_RECORD_UPDATED: 'medical_record.updated',
  DENTAL_RECORD_CREATED: 'dental_record.created',
  MEDICINE_LOW_STOCK: 'medicine.low_stock',
  MEDICINE_OUT_OF_STOCK: 'medicine.out_of_stock',
  INVENTORY_EXPIRING: 'inventory.expiring',
  INVENTORY_EXPIRED: 'inventory.expired',
  USER_CREATED: 'user.created',
  USER_ROLE_CHANGED: 'user.role_changed',
  SYSTEM_SECURITY_ALERT: 'system.security_alert',
  SYSTEM_ANNOUNCEMENT: 'system.announcement',
  QUEUE_PATIENT_CALLED: 'queue.patient_called',
  PRESCRIPTION_CREATED: 'prescription.created',
  REFERRAL_CREATED: 'referral.created',
  CLEARANCE_ISSUED: 'clearance.issued',
} as const;

export const NOTIFICATION_CHANNEL_POLICY: Record<NotificationPriority, NotificationChannel[]> = {
  info: ['in_app'],
  success: ['in_app'],
  warning: ['in_app'],
  high: ['in_app', 'push'],
  critical: ['in_app', 'push', 'email'],
};
