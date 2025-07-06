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
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const HODDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const getProofVerificationChip = (proofSubmitted, proofVerified) => {
    if (!proofSubmitted) {
      return <Chip label="NOT SUBMITTED" color="default" size="small" />;
    } else if (proofVerified) {
      return <Chip label="VERIFIED" color="success" size="small" />;
    } else {
      return <Chip label="PENDING VERIFICATION" color="warning" size="small" />;
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log("Fetching HOD requests...");
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const res = await axios.get("http://localhost:5000/api/od-requests/hod", {
        headers: {
          Authorization: `Bearer ${token}` // Changed from x-auth-token to Bearer token
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
        console.error("Error response:", err.response.data);
        setError(err.response.data.message || "Error fetching requests");
      } else if (err.request) {
        console.error("No response received:", err.request);
        setError("No response from server. Please check your connection.");
      } else {
        console.error("Error setting up request:", err.message);
        setError("Error setting up request: " + err.message);
      }
    } finally {
      setLoading(false);
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

  // Update handleSubmit function to use the correct token format
  const handleSubmit = async (action) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const requestBody = {
        status: action === "approve" ? "approved_by_hod" : "rejected",
        remarks: comment,
      };

      await axios.put(
        `http://localhost:5000/api/od-requests/${selectedRequest}/hod-${action}`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}` // Changed from x-auth-token to Bearer token
          },
        }
      );
      setSuccess(`Request ${action}ed successfully`);
      handleDialogClose();
      fetchRequests();
    } catch (err) {
      console.error("Error updating request:", err);
      setError(err.response?.data?.message || `Error ${action}ing request`);
    }
  };

  const getStatusChip = (status) => {
    const statusColors = {
      pending: "warning",
      approved_by_advisor: "info",
      approved_by_hod: "success",
      rejected: "error",
      forwarded_to_hod: "primary",
    };

    return (
      <Chip
        label={status.replace(/_/g, " ").toUpperCase()}
        color={statusColors[status]}
        size="small"
      />
    );
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

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
                <TableCell>Year</TableCell>
                <TableCell>Event Name</TableCell>
                <TableCell>Event Date</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Advisor Comment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Proof Verification Status</TableCell>
                <TableCell>Brochure</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.student?.user?.name || "N/A"}</TableCell>
                  <TableCell>{request.student?.year || "N/A"}</TableCell>
                  <TableCell>{request.eventName}</TableCell>
                  <TableCell>
                    {request.eventDate
                      ? new Date(request.eventDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {request.startDate
                      ? new Date(request.startDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {request.endDate
                      ? new Date(request.endDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{request.advisorComment || "-"}</TableCell>
                  <TableCell>{getStatusChip(request.status)}</TableCell>
                  <TableCell>
                    {getProofVerificationChip(
                      request.proofSubmitted,
                      request.proofVerified
                    )}
                  </TableCell>
                  <TableCell>
                    {request.brochure && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          window.open(
                            `http://localhost:5000/${request.brochure}`,
                            "_blank"
                          )
                        }
                        sx={{ ml: 1 }}
                      >
                        View Brochure
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {(request.status === "approved_by_advisor" ||
                      request.status === "forwarded_to_hod") && (
                      <Box sx={{ display: "flex", gap: 1 }}>
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
