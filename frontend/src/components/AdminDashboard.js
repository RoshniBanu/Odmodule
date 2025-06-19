import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manageSystemOpen, setManageSystemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('reason');
  const [systemSettings, setSystemSettings] = useState({
    responseTimeout: 30,
    autoForwardEnabled: true,
    notificationEnabled: true,
  });

  const getProofVerificationChip = (proofSubmitted, proofVerified) => {
    if (!proofSubmitted) {
      return <Chip label="NOT SUBMITTED" color="default" size="small" />;
    } else if (proofVerified) {
      return <Chip label="VERIFIED" color="success" size="small" />;
    } else {
      return <Chip label="PENDING VERIFICATION" color="warning" size="small" />;
    }
  };

  const fetchRequests = async (params = {}) => {
    try {
      let url = '/api/od-requests/admin';
      const query = [];
      if (params.rollNumber) query.push(`rollNumber=${encodeURIComponent(params.rollNumber)}`);
      if (params.year) query.push(`year=${encodeURIComponent(params.year)}`);
      if (query.length > 0) url += `?${query.join('&')}`;
      const { data } = await axios.get(url);
      setRequests(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data } = await axios.get('/api/admin/system-settings');
      setSystemSettings(data);
    } catch (err) {
      console.error('Error fetching system settings:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchSystemSettings();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleForwardToHod = async (requestId) => {
    try {
      await axios.put(`/api/od-requests/${requestId}/forward-to-hod`);
      fetchRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleManageSystem = () => {
    setManageSystemOpen(true);
  };

  const handleCloseManageSystem = () => {
    setManageSystemOpen(false);
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    // For rollNumber or year, trigger backend search
    if (searchField === 'rollNumber') {
      fetchRequests({ rollNumber: event.target.value });
    } else if (searchField === 'year') {
      fetchRequests({ year: event.target.value });
    }
  };

  const handleSearchFieldChange = (event) => {
    setSearchField(event.target.value);
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put('/api/admin/system-settings', systemSettings);
      setManageSystemOpen(false);
      // Show success message
      setError(null);
      // Refresh requests to apply new settings
      fetchRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredRequests = searchField === 'rollNumber' || searchField === 'year'
    ? requests // Already filtered by backend
    : requests.filter(request => {
        if (!searchQuery) return true;
        const searchValue = searchQuery.toLowerCase();
        switch (searchField) {
          case 'reason':
            return request.reason.toLowerCase().includes(searchValue);
          case 'student':
            return request.student?.name.toLowerCase().includes(searchValue);
          case 'department':
            return request.department.toLowerCase().includes(searchValue);
          case 'event':
            return request.eventName.toLowerCase().includes(searchValue);
          default:
            return true;
        }
      });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved_by_advisor':
        return 'success';
      case 'approved_by_hod':
        return 'success';
      case 'rejected':
        return 'error';
      case 'forwarded_to_admin':
        return 'warning';
      case 'forwarded_to_hod':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTimeElapsed = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Admin Dashboard
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleManageSystem}
        >
          Manage System
        </Button>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            value={searchField}
            onChange={handleSearchFieldChange}
            variant="outlined"
          >
            <MenuItem value="reason">Search by Reason</MenuItem>
            <MenuItem value="student">Search by Student</MenuItem>
            <MenuItem value="department">Search by Department</MenuItem>
            <MenuItem value="event">Search by Event</MenuItem>
            <MenuItem value="rollNumber">Search by Roll Number</MenuItem>
            <MenuItem value="year">Search by Year</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredRequests.length === 0 ? (
        <Alert severity="info">No OD requests found.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student Name</TableCell>
                <TableCell>Roll Number</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Faculty Advisor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Proof Verification Status</TableCell>
                <TableCell>Time Elapsed</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.student?.name || 'N/A'}</TableCell>
                  <TableCell>{request.student?.registerNo || 'N/A'}</TableCell>
                  <TableCell>{request.department || 'N/A'}</TableCell>
                  <TableCell>{request.eventName || 'N/A'}</TableCell>
                  <TableCell>
                    {request.eventDate ? new Date(request.eventDate).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={request.reason}>
                      <Typography noWrap style={{ maxWidth: 200 }}>
                        {request.reason}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{request.classAdvisor?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status?.replace(/_/g, ' ')}
                      color={getStatusColor(request.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {getProofVerificationChip(request.proofSubmitted, request.proofVerified)}
                  </TableCell>
                  <TableCell>
                    {request.lastStatusChangeAt ? getTimeElapsed(request.lastStatusChangeAt) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {request.status === 'forwarded_to_admin' && (
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleForwardToHod(request._id)}
                      >
                        Forward to HOD
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={manageSystemOpen} onClose={handleCloseManageSystem}>
        <DialogTitle>Manage System Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Response Timeout (seconds)"
                type="number"
                value={systemSettings.responseTimeout}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  responseTimeout: parseInt(e.target.value)
                })}
                inputProps={{ min: 10, max: 300 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Auto Forward"
                value={systemSettings.autoForwardEnabled}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  autoForwardEnabled: e.target.value === 'true'
                })}
              >
                <MenuItem value={true}>Enabled</MenuItem>
                <MenuItem value={false}>Disabled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Notifications"
                value={systemSettings.notificationEnabled}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  notificationEnabled: e.target.value === 'true'
                })}
              >
                <MenuItem value={true}>Enabled</MenuItem>
                <MenuItem value={false}>Disabled</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageSystem}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard; 