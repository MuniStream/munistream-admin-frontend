import { api } from './api';

export type NotificationChannel = 'email' | 'whatsapp';

export type DeliveryStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'retrying'
  | 'rate_limited'
  | 'skipped_opt_out';

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  credentials: Record<string, string | number | boolean>;
  from_address: string | null;
  test_recipient: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ChannelConfigInput {
  enabled: boolean;
  credentials: Record<string, string | number | boolean>;
  from_address?: string | null;
  test_recipient?: string | null;
}

export interface NotificationTemplate {
  id: string;
  key: string;
  locale: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  variables_doc: string | null;
  active: boolean;
  updated_at: string;
}

export interface NotificationTemplateInput {
  key: string;
  locale: string;
  channel: NotificationChannel;
  subject?: string | null;
  body: string;
  variables_doc?: string | null;
  active: boolean;
}

export interface NotificationTrigger {
  id: string;
  workflow_id: string;
  step_id: string | null;
  event_type: string;
  template_key: string;
  channels: NotificationChannel[];
  active: boolean;
  updated_at: string;
}

export interface NotificationTriggerInput {
  workflow_id: string;
  step_id?: string | null;
  event_type: string;
  template_key: string;
  channels: NotificationChannel[];
  active: boolean;
}

export interface NotificationDelivery {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  template_key: string;
  status: DeliveryStatus;
  attempts: number;
  workflow_id: string | null;
  step_id: string | null;
  instance_id: string | null;
  rendered_preview: string | null;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface BaileysStatus {
  tenantId: string;
  status:
    | 'not_connected'
    | 'connecting'
    | 'waiting_qr'
    | 'connected'
    | 'requires_reauth'
    | 'error';
  qrAvailable: boolean;
  qrGeneratedAt: string | null;
  lastError: string | null;
  reconnectAttempts: number;
}

export interface BaileysQr {
  tenantId: string;
  status: string;
  qrDataUrl: string;
  generatedAt: string;
}

export const notificationsService = {
  listChannels: () => api.get<ChannelConfig[]>('/notifications/channels').then((r) => r.data),
  getChannel: (channel: NotificationChannel) =>
    api.get<ChannelConfig>(`/notifications/channels/${channel}`).then((r) => r.data),
  saveChannel: (channel: NotificationChannel, payload: ChannelConfigInput) =>
    api.put<ChannelConfig>(`/notifications/channels/${channel}`, payload).then((r) => r.data),
  testChannel: (
    channel: NotificationChannel,
    payload: { recipient?: string; subject?: string; body?: string },
  ) => api.post<{ success: boolean; provider_reference?: string }>(
    `/notifications/channels/${channel}/test`,
    payload,
  ).then((r) => r.data),

  listTemplates: (channel?: NotificationChannel) =>
    api
      .get<NotificationTemplate[]>('/notifications/templates', {
        params: channel ? { channel } : undefined,
      })
      .then((r) => r.data),
  createTemplate: (payload: NotificationTemplateInput) =>
    api.post<NotificationTemplate>('/notifications/templates', payload).then((r) => r.data),
  updateTemplate: (id: string, payload: NotificationTemplateInput) =>
    api.put<NotificationTemplate>(`/notifications/templates/${id}`, payload).then((r) => r.data),
  deleteTemplate: (id: string) =>
    api.delete(`/notifications/templates/${id}`).then(() => undefined),
  previewTemplate: (payload: {
    subject?: string | null;
    body: string;
    channel: NotificationChannel;
    context?: Record<string, unknown>;
  }) =>
    api
      .post<{ subject: string | null; body: string }>('/notifications/templates/preview', payload)
      .then((r) => r.data),

  listTriggers: (workflowId?: string) =>
    api
      .get<NotificationTrigger[]>('/notifications/triggers', {
        params: workflowId ? { workflow_id: workflowId } : undefined,
      })
      .then((r) => r.data),
  createTrigger: (payload: NotificationTriggerInput) =>
    api.post<NotificationTrigger>('/notifications/triggers', payload).then((r) => r.data),
  updateTrigger: (id: string, payload: NotificationTriggerInput) =>
    api.put<NotificationTrigger>(`/notifications/triggers/${id}`, payload).then((r) => r.data),
  deleteTrigger: (id: string) =>
    api.delete(`/notifications/triggers/${id}`).then(() => undefined),

  listDeliveries: (params: {
    status?: DeliveryStatus;
    channel?: NotificationChannel;
    instance_id?: string;
    limit?: number;
    skip?: number;
  } = {}) =>
    api
      .get<NotificationDelivery[]>('/notifications/deliveries', { params })
      .then((r) => r.data),

  baileysStatus: () =>
    api.get<BaileysStatus>('/notifications/baileys/status').then((r) => r.data),
  baileysQr: () =>
    api.get<BaileysQr>('/notifications/baileys/qr').then((r) => r.data),
  baileysConnect: () =>
    api.post<BaileysStatus>('/notifications/baileys/connect').then((r) => r.data),
  baileysLogout: () =>
    api.post<BaileysStatus>('/notifications/baileys/logout').then((r) => r.data),
};
