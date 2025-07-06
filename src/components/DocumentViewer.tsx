import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Toolbar,
  CircularProgress,
  Alert,
  Button,
  Menu,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  Photo as PhotoIcon
} from '@mui/icons-material';
import { Document } from '../types/document';

interface DocumentViewerProps {
  document: Document;
  height?: number | string;
  showToolbar?: boolean;
  onDownload?: (document: Document) => void;
  onAnalyze?: (document: Document) => void;
}

interface ViewerState {
  zoom: number;
  rotation: number;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  height = 400,
  showToolbar = true,
  onDownload,
  onAnalyze
}) => {
  const [viewerState, setViewerState] = useState<ViewerState>({
    zoom: 1,
    rotation: 0,
    loading: true,
    error: null,
    currentPage: 1,
    totalPages: 1
  });

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [document]);

  const loadDocument = async () => {
    setViewerState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // In a real implementation, this would fetch the document from the backend
      // For now, we'll simulate document loading
      setTimeout(() => {
        // Simulate different document types
        if (document.mime_type?.startsWith('image/')) {
          setDocumentUrl('/api/placeholder-image.jpg'); // Placeholder
        } else if (document.mime_type === 'application/pdf') {
          setDocumentUrl('/api/placeholder-pdf.pdf'); // Placeholder
        }
        
        setViewerState(prev => ({
          ...prev,
          loading: false,
          totalPages: document.metadata?.page_count || 1
        }));
      }, 1000);
    } catch (error) {
      setViewerState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load document'
      }));
    }
  };

  const handleZoomIn = () => {
    setViewerState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + 0.25, 3)
    }));
  };

  const handleZoomOut = () => {
    setViewerState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - 0.25, 0.25)
    }));
  };

  const handleRotateLeft = () => {
    setViewerState(prev => ({
      ...prev,
      rotation: (prev.rotation - 90) % 360
    }));
  };

  const handleRotateRight = () => {
    setViewerState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const getDocumentTypeDisplay = () => {
    const mimeType = document.mime_type || '';
    if (mimeType.startsWith('image/')) {
      return 'Image Document';
    } else if (mimeType === 'application/pdf') {
      return 'PDF Document';
    } else if (mimeType.startsWith('text/')) {
      return 'Text Document';
    }
    return 'Document';
  };

  const renderDocumentContent = () => {
    if (viewerState.loading) {
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            p: 3
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading document...
          </Typography>
          <LinearProgress sx={{ width: '200px', mt: 1 }} />
        </Box>
      );
    }

    if (viewerState.error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            {viewerState.error}
          </Alert>
          <Button onClick={loadDocument} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Box>
      );
    }

    // Document preview placeholder (in real implementation, would show actual document)
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 3,
          transform: `scale(${viewerState.zoom}) rotate(${viewerState.rotation}deg)`,
          transition: 'transform 0.2s ease-in-out'
        }}
      >
        <PhotoIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {getDocumentTypeDisplay()}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {document.filename}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {document.filename || 'Document preview would appear here'}
        </Typography>
        
        {/* Document metadata display */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" display="block">
            Size: {document.file_size ? 
              `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
          </Typography>
          <Typography variant="caption" display="block">
            Type: {document.mime_type || 'Unknown'}
          </Typography>
          {document.metadata?.page_count && (
            <Typography variant="caption" display="block">
              Pages: {document.metadata.page_count}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Paper sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {showToolbar && (
        <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {document.filename} {viewerState.totalPages > 1 && `(${viewerState.currentPage}/${viewerState.totalPages})`}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={handleZoomOut} disabled={viewerState.zoom <= 0.25}>
              <ZoomOutIcon />
            </IconButton>
            
            <Typography variant="caption" sx={{ alignSelf: 'center', minWidth: 40, textAlign: 'center' }}>
              {Math.round(viewerState.zoom * 100)}%
            </Typography>
            
            <IconButton size="small" onClick={handleZoomIn} disabled={viewerState.zoom >= 3}>
              <ZoomInIcon />
            </IconButton>
            
            <IconButton size="small" onClick={handleRotateLeft}>
              <RotateLeftIcon />
            </IconButton>
            
            <IconButton size="small" onClick={handleRotateRight}>
              <RotateRightIcon />
            </IconButton>
            
            {onDownload && (
              <IconButton size="small" onClick={() => onDownload(document)}>
                <DownloadIcon />
              </IconButton>
            )}
            
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Toolbar>
      )}
      
      <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'grey.50' }}>
        {renderDocumentContent()}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {onDownload && (
          <MenuItem onClick={() => { onDownload(document); handleMenuClose(); }}>
            <DownloadIcon sx={{ mr: 1 }} />
            Download
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <PrintIcon sx={{ mr: 1 }} />
          Print
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <FullscreenIcon sx={{ mr: 1 }} />
          Fullscreen
        </MenuItem>
        {onAnalyze && (
          <MenuItem onClick={() => { onAnalyze(document); handleMenuClose(); }}>
            <PhotoIcon sx={{ mr: 1 }} />
            AI Analysis
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default DocumentViewer;