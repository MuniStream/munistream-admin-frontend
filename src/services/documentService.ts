import api from './api';
import type { Document, DocumentFolder } from '@/types/document';

export const documentService = {
  // Get documents for admin management (both pending and processed)
  async getDocuments(citizenId?: string, params?: {
    document_type?: string;
    status?: string;
    citizen_name?: string;
    date_from?: string;
    date_to?: string;
    verification_priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ documents: Document[]; total: number }> {
    // If status is specified and not pending, get all documents, otherwise get pending
    const endpoint = params?.status && params.status !== 'pending_verification' 
      ? '/admin/documents' 
      : '/admin/pending-documents';
      
    const response = await api.get(endpoint, { 
      params: { citizen_id: citizenId, ...params } 
    });
    return { documents: response.data || [], total: response.data?.length || 0 };
  },

  // Get specific document
  async getDocument(documentId: string): Promise<Document> {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },

  // Download document file
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Verify document (admin action)
  async verifyDocument(documentId: string, decision: 'approve' | 'reject', comments?: string): Promise<void> {
    await api.post(`/documents/${documentId}/verify`, {
      decision,
      comments
    });
  },

  // Get document verification queue
  async getVerificationQueue(params?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ documents: Document[]; total: number }> {
    const response = await api.get('/documents/verification-queue', { params });
    return response.data;
  },

  // Get document folder
  async getDocumentFolder(citizenId: string): Promise<DocumentFolder> {
    const response = await api.get(`/documents/folder`, {
      params: { citizen_id: citizenId }
    });
    return response.data;
  },

  // Get document statistics
  async getDocumentStats(): Promise<{
    total_documents: number;
    pending_verification: number;
    verified_today: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    storage_usage_mb: number;
  }> {
    const response = await api.get('/documents/stats');
    return response.data;
  },

  // Get reuse suggestions for a workflow
  async getReusesuggestions(workflowId: string, citizenId: string): Promise<{
    suggested_documents: Array<{
      document: Document;
      relevance_score: number;
      usage_history: number;
    }>;
    missing_types: string[];
  }> {
    const response = await api.get(`/documents/reuse-suggestions/${workflowId}`, {
      params: { citizen_id: citizenId }
    });
    return response.data;
  },

  // Sign document
  async signDocument(documentId: string, signature: {
    signer_role: string;
    signature_data: string;
    comments?: string;
  }): Promise<void> {
    await api.post(`/documents/${documentId}/sign`, signature);
  },

  // Get documents pending signature
  async getPendingSignatures(assignedTo?: string): Promise<Document[]> {
    const response = await api.get('/documents/pending-signatures', {
      params: { assigned_to: assignedTo }
    });
    return response.data.documents;
  }
};

export default documentService;