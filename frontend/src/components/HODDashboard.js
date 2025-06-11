import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from "@mui/material";
import axios from "axios";

const HODDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const fetchRequests = async () => {
    try {
      console.log("Fetching HOD requests...");
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const res = await axios.get("http://localhost:5000/api/od-requests/hod", {
        headers: {
          "x-auth-token": token,
        },
      });

      console.log("HOD requests response:", res.data);
      if (Array.isArray(res.data)) {
        setRequests(res.data);
        setError("");
      } else {
        console.error("Invalid response format:", res.data);
        setError("Invalid response format from server");
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response:", err.response.data);
        setError(err.response.data.message || "Error fetching requests");
      } else if (err.request) {
        // The request was made but no response was received
        console.error("No response received:", err.request);
        setError("No response from server. Please check your connection.");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up request:", err.message);
        setError("Error setting up request: " + err.message);
      }
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    setSelectedRequest(requestId);
    setOpenDialog(true);
  };

  const handleReject = async (requestId) => {
    setSelectedRequest(requestId);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setComment("");
    setSelectedRequest(null);
  };

  const handleSubmit = async (action) => {
    try {
      await axios.put(
        `http://localhost:5000/api/od-requests/${selectedRequest}/hod-${action}`,
        { comment },
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        }
      );
      setSuccess(`Request ${action}ed successfully`);
      handleDialogClose();
      fetchRequests();
    } catch (err) {
      setError(`Error ${action}ing request`);
      console.error("Error:", err);
    }
  };

  const getStatusChip = (status) => {
    const statusColors = {
      pending: "warning",
      approved_by_advisor: "info",
      approved_by_hod: "success",
      rejected: "error",
    };

    return (
      <Chip
        label={status.replace(/_/g, " ").toUpperCase()}
        color={statusColors[status]}
        size="small"
      />
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          HOD Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Event Name</TableCell>
                <TableCell>Event Date</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Advisor Comment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.student.name}</TableCell>
                  <TableCell>{request.department}</TableCell>
                  <TableCell>{request.year}</TableCell>
                  <TableCell>{request.eventName}</TableCell>
                  <TableCell>
                    {new Date(request.eventDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(request.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(request.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{request.advisorComment || "-"}</TableCell>
                  <TableCell>{getStatusChip(request.status)}</TableCell>
                  <TableCell>
                    {request.status === "approved_by_advisor" && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => handleApprove(request._id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleReject(request._id)}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={() => handleSubmit("approve")} color="success">
            Approve
          </Button>
          <Button onClick={() => handleSubmit("reject")} color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HODDashboard;
