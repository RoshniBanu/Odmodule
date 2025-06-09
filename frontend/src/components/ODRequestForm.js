import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const ODRequestForm = () => {
  const [formData, setFormData] = useState({
    classAdvisor: '',
    eventName: '',
    eventDate: null,
    startDate: null,
    endDate: null,
    reason: ''
  });
  const [advisors, setAdvisors] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Fetch faculty members for class advisor selection
    const fetchAdvisors = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/faculty', {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        setAdvisors(res.data);
      } catch (err) {
        setError('Error fetching faculty members');
      }
    };

    fetchAdvisors();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDateChange = (field) => (date) => {
    setFormData({
      ...formData,
      [field]: date
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/od-requests', formData, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      setSuccess('OD Request submitted successfully');
      setFormData({
        classAdvisor: '',
        eventName: '',
        eventDate: null,
        startDate: null,
        endDate: null,
        reason: ''
      });
    } catch (err) {
      setError(err.response?.data?.msg || 'Error submitting request');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Submit OD Request
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Class Advisor</InputLabel>
                  <Select
                    name="classAdvisor"
                    value={formData.classAdvisor}
                    onChange={handleChange}
                    required
                  >
                    {advisors.map((advisor) => (
                      <MenuItem key={advisor._id} value={advisor._id}>
                        {advisor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Name"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Event Date"
                  value={formData.eventDate}
                  onChange={handleDateChange('eventDate')}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={handleDateChange('startDate')}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={handleDateChange('endDate')}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                >
                  Submit Request
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default ODRequestForm; 