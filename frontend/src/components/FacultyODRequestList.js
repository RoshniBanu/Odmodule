import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
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
  Box,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import axios from "axios";

const FacultyODRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [action, setAction] = useState("");
  const [viewProofDialogOpen, setViewProofDialogOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      console.log("Fetching faculty requests...");
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const res = await axios.get(
        "http://localhost:5000/api/od-requests/faculty",
        {
          headers: {
            "x-auth-token": token,
          },
        }
      );

      console.log("Faculty requests response:", res.data);
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
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = (requestId) => {
    setSelectedRequest(requestId);
    setAction("approve");
    setOpenDialog(true);
  };

  const handleReject = (requestId) => {
    setSelectedRequest(requestId);
    setAction("reject");
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setComment("");
    setSelectedRequest(null);
    setAction("");
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const endpoint =
        action === "approve" ? "advisor-approve" : "advisor-reject";
      const res = await axios.put(
        `http://localhost:5000/api/od-requests/${selectedRequest}/${endpoint}`,
        { comment },
        {
          headers: {
            "x-auth-token": token,
          },
        }
      );

      console.log("Request updated:", res.data);
      setSuccess(`Request ${action}d successfully`);
      handleDialogClose();
      fetchRequests();
    } catch (err) {
      console.error("Error updating request:", err);
      if (err.response) {
        setError(err.response.data.message || `Error ${action}ing request`);
      } else {
        setError(`Error ${action}ing request. Please try again.`);
      }
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

  const handleProofVerification = async (requestId, verified) => {
    try {
      await axios.put(
        `http://localhost:5000/api/od-requests/${requestId}/verify-proof`,
        { verified },
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        }
      );
      setSuccess(`Proof ${verified ? "verified" : "rejected"} successfully`);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.msg || "Error verifying proof");
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Faculty Dashboard
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

        <TableContainer>
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
                  <TableCell>{getStatusChip(request.status)}</TableCell>
                  <TableCell>
                    {request.status === "pending" && (
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
      </Paper>

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
          <Button
            onClick={handleSubmit}
            color={action === "approve" ? "success" : "error"}
          >
            {action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
      >
        <DialogTitle>Update Request Status</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Remarks"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRequest(null)}>Cancel</Button>
          <Button onClick={() => handleSubmit()} color="success">
            Approve
          </Button>
          <Button onClick={() => handleSubmit()} color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewProofDialogOpen}
        onClose={() => setViewProofDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>View Proof Document</DialogTitle>
        <DialogContent>
          {selectedRequest?.proofDocument && (
            <Box className="proof-document-container">
              {selectedRequest.proofDocument.endsWith(".pdf") ? (
                <iframe
                  src={selectedRequest.proofDocument}
                  style={{ width: "100%", height: "500px" }}
                  title="Proof Document"
                />
              ) : (
                <img
                  src={selectedRequest.proofDocument}
                  alt="Proof Document"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewProofDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FacultyODRequestList;
