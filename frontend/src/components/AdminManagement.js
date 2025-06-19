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
  TextField,
  InputAdornment,
  Grid,
  Tooltip,
  MenuItem,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Title
} from 'chart.js';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(ArcElement, ChartTooltip, Legend, Title);

const API_BASE_URL = 'http://localhost:5000';

const AdminManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('reason');
  const [studentStats, setStudentStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStudentStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/od-requests/admin/student-stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudentStats(response.data);
      setStatsLoading(false);
    } catch (err) {
      console.error('Error fetching student stats:', err);
      setError(err.response?.data?.message || 'Failed to fetch student statistics');
      setStatsLoading(false);
    }
  };

  const fetchAllRequests = async (params = {}) => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/od-requests/admin/all`;
      const query = [];
      if (params.rollNumber) query.push(`rollNumber=${encodeURIComponent(params.rollNumber)}`);
      if (params.year) query.push(`year=${encodeURIComponent(params.year)}`);
      if (query.length > 0) url += `?${query.join('&')}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setRequests(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch requests');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudentStats();
    fetchAllRequests();
  }, []);

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    // For rollNumber or year, trigger backend search
    if (searchField === 'rollNumber') {
      fetchAllRequests({ rollNumber: event.target.value });
    } else if (searchField === 'year') {
      fetchAllRequests({ year: event.target.value });
    }
  };

  const handleSearchFieldChange = (event) => {
    setSearchField(event.target.value);
  };

  const filteredRequests = searchField === 'rollNumber' || searchField === 'year'
    ? requests // Already filtered by backend
    : requests.filter(request => {
        if (!searchQuery) return true;
        const searchValue = searchQuery.toLowerCase();
        switch (searchField) {
          case 'reason':
            return request.reason?.toLowerCase().includes(searchValue);
          case 'student':
            return request.student?.name?.toLowerCase().includes(searchValue);
          case 'department':
            return request.department?.toLowerCase().includes(searchValue);
          case 'event':
            return request.eventName?.toLowerCase().includes(searchValue);
          default:
            return true;
        }
      });

  const handleForwardToHod = async (requestId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/od-requests/${requestId}/forward-to-hod`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchAllRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to forward request to HOD');
    }
  };

  const getTimeElapsed = (timestamp) => {
    if (!timestamp) return 'N/A';
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

  const chartData = {
    labels: studentStats.map(stat => `Year ${stat.year}`),
    datasets: [
      {
        data: studentStats.map(stat => stat.count),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Student Distribution by Year',
        font: {
          size: 16
        }
      }
    }
  };

  if (loading || statsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Admin Management
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Student Distribution by Year
            </Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              {studentStats.length > 0 ? (
                <Pie data={chartData} options={chartOptions} />
              ) : (
                <Alert severity="info">No student data available</Alert>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Statistics Summary
            </Typography>
            <Box sx={{ mt: 2 }}>
              {studentStats.length > 0 ? (
                studentStats.map((stat) => (
                  <Typography key={stat.year} variant="body1" gutterBottom>
                    Year {stat.year}: {stat.count} students
                  </Typography>
                ))
              ) : (
                <Alert severity="info">No statistics available</Alert>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        All OD Requests
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
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

      {filteredRequests.length === 0 ? (
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
                    <Tooltip title={request.reason || 'No reason provided'}>
                      <Typography noWrap style={{ maxWidth: 200 }}>
                        {request.reason || 'N/A'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{request.classAdvisor?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status?.replace(/_/g, ' ') || 'N/A'}
                      color={getStatusColor(request.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {getTimeElapsed(request.lastStatusChangeAt || request.createdAt)}
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
    </Box>
  );
};

export default AdminManagement; 