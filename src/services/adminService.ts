import api from './api';
import type { RespuestaSemaforo } from '@/types/semaforo';
import type { ConfiguracionReportes, Reporte } from '@/types/reportes';
import type { BandejaAtencion, EstadoAtencion, Satisfaccion, SolicitudAtencion } from '@/types/atencion';

export const adminService = {
  // Pending Documents
  async getPendingDocuments(): Promise<any[]> {
    const response = await api.get('/admin/pending-documents');
    return response.data || [];
  },

  // Pending Signatures
  async getPendingSignatures(): Promise<any[]> {
    const response = await api.get('/admin/pending-signatures');
    return response.data || [];
  },

  // Manual Reviews
  async getManualReviews(): Promise<any[]> {
    const response = await api.get('/admin/manual-reviews');
    return response.data || [];
  },

  // Process Document Verification
  async processDocumentVerification(data: {
    document_id: string;
    decision: string;
    comments: string;
  }): Promise<void> {
    await api.post(`/admin/documents/${data.document_id}/admin-verify`, {
      decision: data.decision,
      comments: data.comments
    });
  },

  // Process Signature
  async processSignature(data: {
    document_id: string;
    signature_method: string;
    comments: string;
  }): Promise<void> {
    await api.post(`/admin/documents/${data.document_id}/sign`, {
      signature_method: data.signature_method,
      signature_data: 'admin_digital_signature',
      comments: data.comments
    });
  },

  // Get Admin Statistics
  async getAdminStats(): Promise<{
    pending_approvals: number;
    pending_documents: number;
    pending_signatures: number;
    manual_reviews: number;
    total_pending: number;
  }> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Get Workflow Instances for Admin
  async getWorkflowInstances(params?: {
    status?: string;
    workflow_id?: string;
    citizen_id?: string;
    assigned_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ instances: any[]; total: number }> {
    const response = await api.get('/instances', { params });
    return response.data;
  },

  // Assign Instance to Admin
  async assignInstance(instance_id: string, admin_id: string): Promise<void> {
    await api.post(`/instances/${instance_id}/assign`, {
      assigned_to: admin_id
    });
  },

  // Get Admin Performance Metrics
  async getAdminMetrics(admin_id?: string): Promise<{
    total_processed: number;
    avg_processing_time: number;
    approval_rate: number;
    pending_count: number;
  }> {
    const response = await api.get(`/admin/metrics`, {
      params: { admin_id }
    });
    return response.data;
  },

  // Get Comprehensive Dashboard Data
  async getDashboardData(): Promise<{
    system_metrics: {
      total_active_citizens: number;
      total_workflow_instances: number;
      instances_created_today: number;
      instances_completed_today: number;
      instances_created_this_week: number;
      instances_completed_this_week: number;
    };
    pending_items: {
      pending_approvals: number;
      pending_documents: number;
      pending_signatures: number;
      manual_reviews: number;
      total_pending: number;
      pending_by_priority: Record<string, number>;
    };
    workflow_metrics: Array<{
      workflow_id: string;
      workflow_name: string;
      total_instances: number;
      active_instances: number;
      completed_instances: number;
      failed_instances: number;
      rejected_instances?: number;
      average_processing_time_hours: number;
      success_rate: number;
      pending_approvals: number;
    }>;
    performance_metrics: {
      average_processing_time_hours: number;
      median_processing_time_hours: number;
      success_rate: number;
      failure_rate: number;
      abandonment_rate: number;
      bottleneck_steps: Array<any>;
    };
    recent_activity: Array<{
      timestamp: string;
      value: number;
      label?: string;
    }>;
    top_workflows: Array<{
      workflow_id: string;
      name: string;
      instances: number;
      success_rate: number;
    }>;
    staff_workload: Record<string, number>;
    system_health: {
      status: string;
      database: string;
      pending_items_backlog: boolean;
      high_priority_items: number;
      db_latency_ms: number | null;
      last_check: string;
    };
    last_updated: string;
  }> {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Hybrid traffic light of open procedures (legal term + dwell in current step)
  async getSemaforo(params?: { workflow_id?: string; color?: string; asignado?: string }): Promise<RespuestaSemaforo> {
    const response = await api.get('/admin/semaforo', { params });
    return response.data;
  },

  // Citizen support requests (help desk)
  async getBandejaAtencion(params?: { estado?: EstadoAtencion; categoria?: string }): Promise<BandejaAtencion> {
    return (await api.get('/admin/atencion', { params })).data;
  },

  async getSolicitudAtencion(id: string): Promise<SolicitudAtencion> {
    return (await api.get(`/admin/atencion/${id}`)).data;
  },

  async responderAtencion(id: string, texto: string): Promise<SolicitudAtencion> {
    return (await api.post(`/admin/atencion/${id}/responder`, { texto })).data;
  },

  async actualizarAtencion(id: string, cambio: { estado?: EstadoAtencion; asignado_a?: string }): Promise<SolicitudAtencion> {
    return (await api.post(`/admin/atencion/${id}/estado`, cambio)).data;
  },

  // Ratings left by applicants on resolved requests
  async getSatisfaccion(workflowId?: string): Promise<Satisfaccion> {
    return (await api.get('/admin/satisfaccion', { params: workflowId ? { workflow_id: workflowId } : {} })).data;
  },

  // Performance reports
  async getReportes(): Promise<Reporte[]> {
    return (await api.get('/admin/reportes')).data.reportes;
  },

  async generarReporte(body: { periodo: 'semanal' | 'mensual' | 'a_demanda'; desde?: string; hasta?: string; enviar?: boolean }): Promise<Reporte> {
    return (await api.post('/admin/reportes', body)).data;
  },

  // The file name is built here: cross-origin, nginx does not expose
  // Content-Disposition to the browser.
  async descargarReporte(reporte: Reporte, formato: 'pdf' | 'xlsx'): Promise<{ blob: Blob; nombre: string }> {
    const r = await api.get(`/admin/reportes/${reporte.reporte_id}/${formato}`, { responseType: 'blob' });
    const dia = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' })
        .format(d).replace(/-/g, '');
    const fin = new Date(new Date(reporte.hasta).getTime() - 1000);
    return { blob: r.data, nombre: `reporte-desempeno-${dia(new Date(reporte.desde))}-${dia(fin)}.${formato}` };
  },

  async getConfiguracionReportes(): Promise<ConfiguracionReportes> {
    return (await api.get('/admin/reportes/configuracion')).data;
  },

  async guardarConfiguracionReportes(cfg: ConfiguracionReportes): Promise<ConfiguracionReportes> {
    return (await api.put('/admin/reportes/configuracion', cfg)).data;
  },

  async evaluarAlertas(): Promise<{ nuevas: number; envios: { destinatario: string; enviado: boolean }[] }> {
    return (await api.post('/admin/reportes/alertas/evaluar')).data;
  }
};

export default adminService;
