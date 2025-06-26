import React from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box
} from '@mui/material';

const LandingPage = () => {
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Welcome to OD Application
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Please sign in or register to continue.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            component={Link}
            to="/login"
            variant="contained"
            color="primary"
            size="large"
          >
            Sign In
          </Button>
          <Button
            component={Link}
            to="/register"
            variant="outlined"
            color="primary"
            size="large"
          >
            Register
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LandingPage; 