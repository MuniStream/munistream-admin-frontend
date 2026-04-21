import api from './api';

export type ProfileFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select';

export interface FieldValidation {
  pattern?: string;
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface ProfileField {
  field_id: string;
  label: string;
  type: ProfileFieldType;
  required: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  validation?: FieldValidation | null;
  options?: FieldOption[] | null;
  order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileFieldPayload {
  field_id: string;
  label: string;
  type: ProfileFieldType;
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  validation?: FieldValidation;
  options?: FieldOption[];
  order?: number;
}

export type UpdateProfileFieldPayload = Partial<Omit<CreateProfileFieldPayload, 'field_id'>> & {
  active?: boolean;
};

const BASE = '/admin/profile-fields';

export const profileFieldsService = {
  async list(): Promise<ProfileField[]> {
    const { data } = await api.get<ProfileField[]>(BASE);
    return data;
  },
  async create(payload: CreateProfileFieldPayload): Promise<ProfileField> {
    const { data } = await api.post<ProfileField>(BASE, payload);
    return data;
  },
  async update(fieldId: string, payload: UpdateProfileFieldPayload): Promise<ProfileField> {
    const { data } = await api.put<ProfileField>(`${BASE}/${fieldId}`, payload);
    return data;
  },
  async softDelete(fieldId: string): Promise<ProfileField> {
    const { data } = await api.delete<ProfileField>(`${BASE}/${fieldId}`);
    return data;
  },
  async reorder(items: { field_id: string; order: number }[]): Promise<ProfileField[]> {
    const { data } = await api.put<ProfileField[]>(`${BASE}/reorder`, { items });
    return data;
  },
};

export default profileFieldsService;
