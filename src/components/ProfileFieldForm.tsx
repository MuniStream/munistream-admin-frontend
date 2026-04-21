import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  FormControlLabel,
  Switch,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type {
  CreateProfileFieldPayload,
  FieldOption,
  ProfileField,
  ProfileFieldType,
} from '../services/profileFieldsService';

const TYPES: { value: ProfileFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'date', label: 'Fecha' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Selección' },
];

interface Props {
  open: boolean;
  initial?: ProfileField | null;
  onClose: () => void;
  onSubmit: (payload: CreateProfileFieldPayload) => Promise<void> | void;
}

export default function ProfileFieldForm({ open, initial, onClose, onSubmit }: Props) {
  const [fieldId, setFieldId] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ProfileFieldType>('text');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [helpText, setHelpText] = useState('');
  const [pattern, setPattern] = useState('');
  const [minLength, setMinLength] = useState<string>('');
  const [maxLength, setMaxLength] = useState<string>('');
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setFieldId(initial.field_id);
      setLabel(initial.label);
      setType(initial.type);
      setRequired(initial.required);
      setPlaceholder(initial.placeholder ?? '');
      setHelpText(initial.help_text ?? '');
      setPattern(initial.validation?.pattern ?? '');
      setMinLength(initial.validation?.min_length?.toString() ?? '');
      setMaxLength(initial.validation?.max_length?.toString() ?? '');
      setOptions(initial.options ?? []);
    } else {
      setFieldId('');
      setLabel('');
      setType('text');
      setRequired(false);
      setPlaceholder('');
      setHelpText('');
      setPattern('');
      setMinLength('');
      setMaxLength('');
      setOptions([]);
    }
  }, [initial, open]);

  const handleSave = async () => {
    const validation: CreateProfileFieldPayload['validation'] = {};
    if (pattern) validation.pattern = pattern;
    if (minLength) validation.min_length = parseInt(minLength, 10);
    if (maxLength) validation.max_length = parseInt(maxLength, 10);

    const payload: CreateProfileFieldPayload = {
      field_id: fieldId,
      label,
      type,
      required,
      placeholder: placeholder || undefined,
      help_text: helpText || undefined,
      validation: Object.keys(validation).length ? validation : undefined,
      options: type === 'select' ? options : undefined,
    };

    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => setOptions([...options, { value: '', label: '' }]);
  const updateOption = (idx: number, patch: Partial<FieldOption>) =>
    setOptions(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  const isEdit = !!initial;
  const canSave =
    !saving &&
    label.trim() &&
    fieldId.trim() &&
    /^[a-z][a-z0-9_]*$/.test(fieldId) &&
    (type !== 'select' || (options.length > 0 && options.every((o) => o.value && o.label)));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Editar campo de perfil' : 'Nuevo campo de perfil'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="ID del campo"
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
            helperText="Identificador único en snake_case, ej. rfc, notification_address"
            disabled={isEdit}
            required
            fullWidth
          />
          <TextField
            label="Etiqueta"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            fullWidth
          />
          <TextField
            select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as ProfileFieldType)}
            fullWidth
          >
            {TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
            label="Obligatorio"
          />
          <TextField
            label="Placeholder"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            fullWidth
          />
          <TextField
            label="Texto de ayuda"
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            fullWidth
          />
          <TextField
            label="Patrón regex (opcional)"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Longitud mínima"
              type="number"
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              fullWidth
            />
            <TextField
              label="Longitud máxima"
              type="number"
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value)}
              fullWidth
            />
          </Stack>

          {type === 'select' && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Opciones
              </Typography>
              <Stack spacing={1}>
                {options.map((o, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="Valor"
                      value={o.value}
                      onChange={(e) => updateOption(idx, { value: e.target.value })}
                      size="small"
                    />
                    <TextField
                      label="Etiqueta"
                      value={o.label}
                      onChange={(e) => updateOption(idx, { label: e.target.value })}
                      size="small"
                      fullWidth
                    />
                    <IconButton onClick={() => removeOption(idx)} size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button startIcon={<AddIcon />} onClick={addOption} size="small">
                  Agregar opción
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
