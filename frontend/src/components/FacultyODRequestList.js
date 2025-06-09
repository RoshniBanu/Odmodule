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
  const [remarks, setRemarks] = useState("");
  const [viewProofDialogOpen, setViewProofDialogOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/od-requests/advisor",
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        }
      );
      setRequests(res.data);
    } catch (err) {
      setError("Error fetching requests");
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await axios.put(
        `http://localhost:5000/api/od-requests/${requestId}/status`,
        { status, remarks },
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        }
      );
      setSuccess(`Request ${status} successfully`);
      setRemarks("");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.msg || "Error updating request status");
    }
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

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          OD Requests from Advisees
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
                <TableCell>Event Name</TableCell>
                <TableCell>Event Date</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Approved by class Advisor?</TableCell>
                <TableCell>Proof Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.student.name}</TableCell>
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
                  <TableCell>
                    <Chip
                      label={request.status}
                      className={`status-${request.status.toLowerCase()}`}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        request.proofSubmitted
                          ? request.proofVerified
                            ? "Verified"
                            : "Pending Verification"
                          : "Not Submitted"
                      }
                      className={`status-${
                        request.proofSubmitted
                          ? request.proofVerified
                            ? "approved"
                            : "pending"
                          : "rejected"
                      }`}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" && (
                      <Box>
                        <Button
                          variant="contained"
                          className="status-approved"
                          size="small"
                          sx={{ mr: 1 }}
                          onClick={() => {
                            setSelectedRequest(request);
                            setRemarks("");
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          className="status-rejected"
                          size="small"
                          onClick={() => {
                            setSelectedRequest(request);
                            setRemarks("");
                          }}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                    {request.proofSubmitted && !request.proofVerified && (
                      <Box>
                        <Tooltip title="View Proof">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedRequest(request);
                              setViewProofDialogOpen(true);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Verify Proof">
                          <IconButton
                            size="small"
                            className="status-approved"
                            onClick={() =>
                              handleProofVerification(request._id, true)
                            }
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Proof">
                          <IconButton
                            size="small"
                            className="status-rejected"
                            onClick={() =>
                              handleProofVerification(request._id, false)
                            }
                          >
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

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
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button
              onClick={() =>
                handleStatusUpdate(selectedRequest._id, "approved")
              }
              color="success"
            >
              Approve
            </Button>
            <Button
              onClick={() =>
                handleStatusUpdate(selectedRequest._id, "rejected")
              }
              color="error"
            >
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
      </Paper>
    </Container>
  );
};

export default FacultyODRequestList;
