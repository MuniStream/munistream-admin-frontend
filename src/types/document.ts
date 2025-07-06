export interface Document {
  document_id: string;
  citizen_id: string;
  filename: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_size: number;
  file_path: string;
  mime_type: string;
  checksum: string;
  uploaded_at: string;
  verified_at?: string;
  verification_method?: VerificationMethod;
  verification_details?: VerificationDetails;
  metadata?: DocumentMetadata;
  tags: string[];
  folder_id?: string;
}

export interface DocumentFolder {
  folder_id: string;
  citizen_id: string;
  name: string;
  description?: string;
  created_at: string;
  document_count: number;
  total_size_bytes: number;
  categories: string[];
}

export interface DocumentShare {
  share_id: string;
  document_id: string;
  shared_with: string;
  shared_by: string;
  access_level: DocumentAccess;
  expires_at?: string;
  created_at: string;
}

export enum DocumentType {
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  BIRTH_CERTIFICATE = 'birth_certificate',
  MARRIAGE_CERTIFICATE = 'marriage_certificate',
  PROOF_OF_ADDRESS = 'proof_of_address',
  BANK_STATEMENT = 'bank_statement',
  UTILITY_BILL = 'utility_bill',
  TAX_DOCUMENT = 'tax_document',
  EMPLOYMENT_LETTER = 'employment_letter',
  ACADEMIC_TRANSCRIPT = 'academic_transcript',
  MEDICAL_RECORD = 'medical_record',
  INSURANCE_POLICY = 'insurance_policy',
  PROPERTY_DEED = 'property_deed',
  VEHICLE_REGISTRATION = 'vehicle_registration',
  BUSINESS_LICENSE = 'business_license',
  PERMIT = 'permit',
  CERTIFICATE = 'certificate',
  OTHER = 'other'
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

export enum VerificationMethod {
  MANUAL = 'manual',
  AI_ASSISTED = 'ai_assisted',
  AUTOMATIC = 'automatic',
  BIOMETRIC = 'biometric'
}

export enum DocumentAccess {
  PRIVATE = 'private',
  WORKFLOW = 'workflow',
  SHARED = 'shared',
  PUBLIC = 'public'
}

export interface VerificationDetails {
  confidence_score: number;
  ai_analysis?: {
    text_extraction: string[];
    authenticity_score: number;
    quality_score: number;
    fraud_indicators: string[];
  };
  manual_review?: {
    reviewer_id: string;
    reviewer_notes: string;
    verified_fields: string[];
  };
}

export interface DocumentMetadata {
  page_count?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  extracted_text?: string;
  detected_fields?: Record<string, string>;
  expiry_date?: string;
  issue_date?: string;
  issuing_authority?: string;
}