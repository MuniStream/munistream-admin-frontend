import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Button,
  Typography,
  CircularProgress,
  Container,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

function Login() {
  const { login, isAuthenticated, loading } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Auto-redirect to Keycloak on mount (optional)
  // Uncomment if you want automatic redirect
  // useEffect(() => {
  //   login();
  // }, []);

  const handleLogin = () => {
    // This will redirect to Keycloak
    login();
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                m: 1,
                p: 2,
                bgcolor: 'primary.main',
                borderRadius: '50%',
              }}
            >
              <LoginIcon sx={{ color: 'white', fontSize: 40 }} />
            </Box>

            <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
              MuniStream Admin
            </Typography>

            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Secure authentication powered by Keycloak
            </Typography>

            <Button
              fullWidth
              size="large"
              variant="contained"
              onClick={handleLogin}
              startIcon={<LoginIcon />}
              sx={{ mt: 2 }}
            >
              Sign In with Keycloak
            </Button>

            <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 3 }}>
              You will be redirected to the secure authentication portal
            </Typography>
          </Box>
        </Paper>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          MuniStream v2.0 - Administrative Portal
        </Typography>
      </Box>
    </Container>
  );
}

export default Login;