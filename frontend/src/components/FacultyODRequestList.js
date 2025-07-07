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
            Authorization: `Bearer ${token}`
          },
        }
      );
  
      console.log("Faculty requests response:", res.data);
      if (res.data) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.response?.data?.message || "Error fetching requests");
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
            Authorization: `Bearer ${localStorage.getItem("token")}`, // Changed header to Bearer token
          },
        }
      );
      setSuccess(`Proof ${verified ? "verified" : "rejected"} successfully`);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.msg || "Error verifying proof");
    }
  };

  const handleViewProof = (proofPath) => {
    if (!proofPath) {
      setError("No proof document available");
      return;
    }
    setSelectedRequest({ proofDocument: proofPath });
    setViewProofDialogOpen(true);
  };

  const getProofVerificationChip = (verified) => {
    return verified ? (
      <Chip label="VERIFIED" color="success" size="small" />
    ) : (
      <Chip label="NOT VERIFIED" color="error" size="small" />
    );
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
                <TableCell>Year</TableCell>
                <TableCell>Event Name</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>Event Date</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Proof Verification Status</TableCell>
                <TableCell>Brochure</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            
           
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>
                    {request.student?.user?.name || request.student?.name || "N/A"}
                  </TableCell>
                  <TableCell>{request.student?.year || "N/A"}</TableCell>

                  <TableCell>{request.eventName}</TableCell>
                  <TableCell>{request.eventType}</TableCell>
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
                  <TableCell>{getStatusChip(request.status)}</TableCell>
                  <TableCell>
                    {request.proofSubmitted ? (
                      getProofVerificationChip(request.proofVerified)
                    ) : (
                      <Chip
                        label="NOT SUBMITTED"
                        color="default"
                        size="small"
                      />
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
                    {request.status === "pending" && (
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
                    {request.proofSubmitted && (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {!request.proofVerified && (
                          <>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() =>
                                handleProofVerification(request._id, true)
                              }
                            >
                              Verify Proof
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              onClick={() =>
                                handleProofVerification(request._id, false)
                              }
                            >
                              Reject Proof
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewProof(request.proofDocument)}
                        >
                          View Proof
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

      <>{/* This dialog was causing issues and has been removed */}</>

      <Dialog
        open={viewProofDialogOpen}
        onClose={() => setViewProofDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>View Proof Document</DialogTitle>
        <DialogContent>
          {selectedRequest?.proofDocument && (
            <Box
              sx={{
                width: "100%",
                height: "80vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "#f5f5f5",
                borderRadius: 1,
                p: 2,
              }}
            >
              {selectedRequest.proofDocument.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={`http://localhost:5000/${selectedRequest.proofDocument}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                  title="Proof Document"
                />
              ) : (
                <img
                  src={`http://localhost:5000/${selectedRequest.proofDocument}`}
                  alt="Proof Document"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
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
