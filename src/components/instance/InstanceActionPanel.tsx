import { useState } from 'react';
import { Alert, Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { DigitalSignatureForm } from '@/components/DigitalSignatureForm';
import { ContextValidationDisplay } from '@/components/ContextValidationDisplay';
import { AdminCatalogSelector } from '@/components/AdminCatalogSelector';
import { AdminAssertionReview } from '@/components/AdminAssertionReview';
import { AdminDataCollectionForm } from '@/components/AdminDataCollectionForm';

/** Estados en los que el trámite espera una acción del revisor. */
export const WAITING_STATES = [
  'user_input',
  'signature',
  'context_validation',
  'catalog_selection',
  'assertion_review',
] as const;

interface Props {
  instanceId: string;
  progress: any;
  onSubmitted: () => void;
}

/**
 * Acciones del revisor sobre el trámite.
 *
 * CONTRATO DEL ENVÍO — no unificar. Los cinco modos mandan al mismo endpoint
 * (`POST /instances/{id}/submit-data`) pero con envoltorios distintos, y cada
 * uno lo espera así del lado del operador:
 *
 *   signature          → JSON con los datos de firma TAL CUAL, sin envolver
 *   assertion_review   → JSON `{ "<taskId>_input": data }`, taskId por defecto 'assertion_review'
 *   entity_selection   → JSON `{ "<taskId>_selections": data }`, por defecto 'admin_workflow_step'
 *   catalog_selection  → JSON `{ "<taskId>_input": data }`, por defecto 'catalog_selector'
 *   context_validation → multipart/form-data  ← no lleva envoltorio JSON
 *   user_input         → multipart/form-data
 *
 * La validación de contexto es la trampa: no tiene rama propia y comparte el
 * camino multipart con la captura de datos. Convertirla a JSON "por coherencia"
 * la rompe en silencio.
 */
export default function InstanceActionPanel({ instanceId, progress, onSubmitted }: Props) {
  const { t } = useTranslation();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El mensaje de éxito va atado al paso que lo produjo.
  //
  // Antes era una cadena suelta que no se limpiaba nunca: en cuanto se enviaba
  // un paso, el panel se quedaba clavado en «datos enviados» y el formulario del
  // paso siguiente no aparecía jamás. Había que recargar la página a mano.
  //
  // Guardando de qué paso es, deja de aplicarse solo en cuanto el trámite avanza,
  // sin efectos ni limpieza que se pueda olvidar.
  const [exito, setExito] = useState<{ paso?: string; mensaje: string } | null>(null);

  const form = progress?.input_form;
  const waitingFor = progress?.waiting_for;

  const esFirma = waitingFor === 'signature';
  const esValidacionContexto = waitingFor === 'context_validation';
  const esCatalogo = waitingFor === 'catalog_selection';
  const esAsercion = waitingFor === 'assertion_review';
  const esSeleccionEntidad = form?.type === 'entity_selection';

  const taskId = form?.current_step_id;

  const trasEnviar = (mensaje: string) => {
    setExito({ paso: taskId, mensaje });
    // Se invalida la consulta en vez de reconsultar tras una espera fija: el
    // estado del trámite ya cambió y no hay razón para adivinar cuándo.
    onSubmitted();
  };

  const enviarJson = async (payload: unknown, mensajeError: string, mensajeExito: string) => {
    setEnviando(true);
    setError(null);
    try {
      const { data } = await api.post(`/instances/${instanceId}/submit-data`, payload);
      trasEnviar(data?.message || mensajeExito);
    } catch {
      setError(mensajeError);
    } finally {
      setEnviando(false);
    }
  };

  const handleSignature = (signatureData: any) =>
    // Sin envoltorio: el operador de firma espera el objeto en la raíz.
    enviarJson(signatureData, t('wfExec.errSubmitSignature', { status: '' }), t('wfExec.signatureSuccess'));

  const handleData = async (data: any) => {
    if (esAsercion) {
      return enviarJson(
        { [`${taskId || 'assertion_review'}_input`]: data },
        t('wfExec.errSubmitAssertion'),
        t('instDetail.submitOk'),
      );
    }

    if (esSeleccionEntidad) {
      return enviarJson(
        { [`${taskId || 'admin_workflow_step'}_selections`]: data },
        t('wfExec.errSubmitEntity'),
        t('wfExec.entitySuccess'),
      );
    }

    if (esCatalogo) {
      return enviarJson(
        { [`${taskId || 'catalog_selector'}_input`]: data },
        t('wfExec.errSubmitCatalog'),
        t('wfExec.catalogSuccess'),
      );
    }

    // Resto (incluida la validación de contexto): multipart con los campos
    // planos y los archivos aparte. Se deja que el navegador ponga el
    // `Content-Type` con su boundary; fijarlo a mano rompe el multipart.
    setEnviando(true);
    setError(null);
    try {
      const formData = new FormData();
      Object.entries(data || {}).forEach(([key, value]) => {
        if (key !== '_files' && value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      if (data?._files) {
        Object.entries(data._files).forEach(([key, file]) => {
          if (file instanceof File) formData.append(key, file);
        });
      }
      const { data: res } = await api.post(`/instances/${instanceId}/submit-data`, formData);
      trasEnviar(res?.message || t('wfExec.dataSuccess'));
    } catch {
      setError(t('wfExec.errSubmitData'));
    } finally {
      setEnviando(false);
    }
  };

  if (!form || !WAITING_STATES.includes(waitingFor)) {
    // Entre dos pasos el trámite pasa unos segundos ejecutándose, sin formulario
    // que pedir. Decir «no hay acción pendiente» justo después de enviar uno se
    // lee como que el trabajo terminó; lo que pasa es que el siguiente paso
    // viene de camino.
    if (progress?.status === 'running') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t('instDetail.procesandoPaso')}
          </Typography>
        </Box>
      );
    }
    return (
      <Alert severity="info">{t('instDetail.noPendingAction')}</Alert>
    );
  }

  if (exito && exito.paso === taskId) {
    return (
      <Alert severity="success">
        <Typography variant="subtitle1">{t('wfExec.dataSubmitted')}</Typography>
        <Typography>{exito.mensaje}</Typography>
      </Alert>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderColor: 'warning.main' }}>
      <CardContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">{t('wfExec.adminActionRequired')}</Typography>
          <Typography variant="body2">{t('wfExec.adminActionRequiredDesc')}</Typography>
        </Alert>

        {esFirma ? (
          <DigitalSignatureForm
            instanceId={instanceId}
            documentToSign={form.signable_data || form.document_to_sign || form}
            operatorConfig={{
              task_id: form.current_step_id || 'signature_step',
              certificate_field: form.certificate_field || 'digital_signature_certificate',
              private_key_field: form.private_key_field || 'digital_signature_private_key',
              password_field: form.password_field || 'digital_signature_password',
              document_type: form.document_type || 'DOCUMENTO_OFICIAL',
            }}
            onSubmitSignature={handleSignature}
            loading={enviando}
            error={error}
          />
        ) : esValidacionContexto ? (
          <ContextValidationDisplay
            instanceId={instanceId}
            formConfig={form}
            onSubmit={handleData}
            loading={enviando}
            error={error}
          />
        ) : esCatalogo ? (
          <AdminCatalogSelector
            title={form.title || t('instDetail.catalogTitle')}
            description={form.description || t('instDetail.catalogDesc')}
            catalog_config={form.catalog_config}
            validation={form.validation}
            validation_errors={form.validation_errors || []}
            previous_input={form.previous_input}
            onSubmit={handleData}
          />
        ) : esAsercion ? (
          <AdminAssertionReview
            title={form.title || t('instDetail.assertionTitle')}
            description={form.description || t('instDetail.assertionDesc')}
            assertions={form.assertions || []}
            onSubmit={handleData}
            loading={enviando}
            error={error}
          />
        ) : (
          <AdminDataCollectionForm
            title={form.title || t('wfExec.provideInfo')}
            description={form.description || t('wfExec.provideInfoDesc')}
            sections={form.sections}
            fields={form.fields?.map((field: any) => ({
              id: field.name,
              name: field.name,
              label: field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1),
              type: field.type,
              required: field.required,
              placeholder: field.placeholder,
              options: field.options,
              entity_type: field.entity_type,
              min_count: field.min_count,
              max_count: field.max_count,
              description: field.description,
            }))}
            onSubmit={handleData}
            isSubmitting={enviando}
            submitButtonText={t('wfExec.submitAdminData')}
          />
        )}
      </CardContent>
    </Card>
  );
}
