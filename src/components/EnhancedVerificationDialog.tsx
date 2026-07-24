import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Button,
  Box,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Psychology as AIIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as VerifiedIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  BugReport as BugIcon
} from '@mui/icons-material';
import { Document, VerificationMethod } from '../types/document';
import DocumentViewer from './DocumentViewer';
import api from '../services/api';

interface EnhancedVerificationDialogProps {
  open: boolean;
  document: Document | null;
  onClose: () => void;
  onVerificationComplete: (document: Document, approved: boolean) => void;
}

interface VerificationAnalysis {
  confidence_score: number;
  fraud_detection_score: number;
  quality_score: number;
  authenticity_score: number;
  overall_verification_score: number;
  verification_decision: 'auto_approve' | 'manual_review' | 'reject';
  extracted_data: Record<string, any>;
  security_features: Record<string, boolean>;
  quality_metrics: Record<string, any>;
  validation_rules_passed: string[];
  validation_rules_failed: string[];
  fraud_indicators: string[];
  recommendations: string[];
  issues: string[];
  processing_time_ms: number;
}

const EnhancedVerificationDialog: React.FC<EnhancedVerificationDialogProps> = ({
  open,
  document,
  onClose,
  onVerificationComplete
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [analysisData, setAnalysisData] = useState<VerificationAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verificationDecision, setVerificationDecision] = useState<'approve' | 'reject' | ''>('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open && document) {
      performAnalysis();
    } else {
      resetState();
    }
  }, [open, document]);

  const resetState = () => {
    setAnalysisData(null);
    setIsAnalyzing(false);
    setVerificationDecision('');
    setVerificationNotes('');
    setIsProcessing(false);
  };

  const performAnalysis = async () => {
    if (!document) return;

    setIsAnalyzing(true);
    try {
      const response = await api.post(`/documents/${document.document_id}/analyze`);
      setAnalysisData(response.data);
      
      // Auto-suggest decision based on verification result
      if (response.data.verification_decision === 'auto_approve') {
        setVerificationDecision('approve');
      } else if (response.data.verification_decision === 'reject') {
        setVerificationDecision('reject');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVerification = async () => {
    if (!document || !verificationDecision) return;

    setIsProcessing(true);
    try {
      await api.post(`/admin/documents/${document.document_id}/admin-verify`, {
        decision: verificationDecision,
        comments: verificationNotes
      });
      
      // Immediately invalidate and refetch the documents list
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      
      onVerificationComplete(document, verificationDecision === 'approve');
      onClose();
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'auto_approve': return 'success';
      case 'manual_review': return 'warning';
      case 'reject': return 'error';
      default: return 'default';
    }
  };

  const formatFieldName = (field: string) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {t('verifyDialog.title', { filename: document.filename })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={document.document_type} color="primary" />
            <Chip label={document.status} color={document.status === 'verified' ? 'success' : 'warning'} />
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Document Viewer */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <DocumentViewer
              document={document}
              height={500}
              onDownload={(doc) => {
                // Handle download
                window.open(`/api/v1/documents/${doc.document_id}/download`, '_blank');
              }}
              onAnalyze={performAnalysis}
            />
          </Grid>

          {/* Analysis Results */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography variant="h6" gutterBottom>
              {t('verifyDialog.aiAnalysis')}
            </Typography>

            {isAnalyzing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                <CircularProgress size={48} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {t('verifyDialog.analyzingDoc')}
                </Typography>
                <LinearProgress sx={{ width: '100%', mt: 1 }} />
              </Box>
            ) : analysisData ? (
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                {/* Overall Score */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AssessmentIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">{t('verifyDialog.overallScore')}</Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={analysisData.overall_verification_score * 100}
                        color={getScoreColor(analysisData.overall_verification_score)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {t('verifyDialog.confidencePct', { value: (analysisData.overall_verification_score * 100).toFixed(1) })}
                      </Typography>
                    </Box>

                    <Chip
                      label={t('verifyDialog.recommendation', { value: formatFieldName(analysisData.verification_decision) })}
                      color={getDecisionColor(analysisData.verification_decision)}
                      sx={{ mb: 1 }}
                    />

                    <Typography variant="caption" display="block">
                      {t('verifyDialog.processingTime', { ms: analysisData.processing_time_ms })}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Individual Scores */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <SpeedIcon sx={{ mr: 1 }} />
                    <Typography>{t('verifyDialog.detailedScores')}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Typography variant="body2" gutterBottom>{t('verifyDialog.confidence')}</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={analysisData.confidence_score * 100}
                          color={getScoreColor(analysisData.confidence_score)}
                        />
                        <Typography variant="caption">
                          {(analysisData.confidence_score * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      
                      <Grid size={6}>
                        <Typography variant="body2" gutterBottom>{t('verifyDialog.quality')}</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={analysisData.quality_score * 100}
                          color={getScoreColor(analysisData.quality_score)}
                        />
                        <Typography variant="caption">
                          {(analysisData.quality_score * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      
                      <Grid size={6}>
                        <Typography variant="body2" gutterBottom>{t('verifyDialog.authenticity')}</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={analysisData.authenticity_score * 100}
                          color={getScoreColor(analysisData.authenticity_score)}
                        />
                        <Typography variant="caption">
                          {(analysisData.authenticity_score * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      
                      <Grid size={6}>
                        <Typography variant="body2" gutterBottom>{t('verifyDialog.fraudRisk')}</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={analysisData.fraud_detection_score * 100}
                          color={analysisData.fraud_detection_score > 0.3 ? 'error' : 'success'}
                        />
                        <Typography variant="caption">
                          {(analysisData.fraud_detection_score * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                {/* Security Features */}
                {Object.keys(analysisData.security_features).length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <ShieldIcon sx={{ mr: 1 }} />
                      <Typography>{t('verifyDialog.securityFeatures')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {Object.entries(analysisData.security_features).map(([feature, present]) => (
                          <ListItem key={feature}>
                            <ListItemIcon>
                              {present ? <VerifiedIcon color="success" /> : <ErrorIcon color="error" />}
                            </ListItemIcon>
                            <ListItemText 
                              primary={formatFieldName(feature)}
                              secondary={present ? t('verifyDialog.present') : t('verifyDialog.notDetected')}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Extracted Data */}
                {Object.keys(analysisData.extracted_data).length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <VisibilityIcon sx={{ mr: 1 }} />
                      <Typography>{t('verifyDialog.extractedData')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {Object.entries(analysisData.extracted_data).map(([key, value]) => (
                          <ListItem key={key}>
                            <ListItemText 
                              primary={formatFieldName(key)}
                              secondary={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Fraud Indicators */}
                {analysisData.fraud_indicators.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <BugIcon sx={{ mr: 1 }} />
                      <Typography>{t('verifyDialog.fraudIndicators')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('verifyDialog.fraudDetected', { count: analysisData.fraud_indicators.length })}
                      </Alert>
                      {analysisData.fraud_indicators.map((indicator, index) => (
                        <Chip 
                          key={index}
                          label={formatFieldName(indicator)}
                          color="warning"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Recommendations */}
                {analysisData.recommendations.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <AIIcon sx={{ mr: 1 }} />
                      <Typography>{t('verifyDialog.aiRecommendations')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {analysisData.recommendations.map((recommendation, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <WarningIcon color="info" />
                            </ListItemIcon>
                            <ListItemText primary={recommendation} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            ) : (
              <Alert severity="info">
                {t('verifyDialog.clickAnalyze')}
              </Alert>
            )}
          </Grid>

          {/* Verification Decision */}
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t('verifyDialog.decision')}
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>{t('verifyDialog.decisionLabel')}</InputLabel>
                  <Select
                    value={verificationDecision}
                    onChange={(e) => setVerificationDecision(e.target.value as 'approve' | 'reject')}
                  >
                    <MenuItem value="approve">{t('verifyDialog.approve')}</MenuItem>
                    <MenuItem value="reject">{t('verifyDialog.reject')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 9 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label={t('verifyDialog.notes')}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder={t('verifyDialog.notesPlaceholder')}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button onClick={performAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? t('verifyDialog.analyzing') : t('verifyDialog.reanalyze')}
        </Button>
        <Button
          variant="contained"
          onClick={handleVerification}
          disabled={!verificationDecision || isProcessing}
        >
          {isProcessing ? t('verifyDialog.processing') : t('verifyDialog.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedVerificationDialog;