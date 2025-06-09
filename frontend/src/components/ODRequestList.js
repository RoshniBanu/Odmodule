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
} from "@mui/material";
import axios from "axios";

const ODRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [viewProofDialogOpen, setViewProofDialogOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/od-requests/student",
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

  const handleProofSubmit = async () => {
    if (!proofFile) {
      setError("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("proofDocument", proofFile);

    try {
      await axios.put(
        `http://localhost:5000/api/od-requests/${selectedRequest._id}/proof`,
        formData,
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setSuccess("Proof submitted successfully");
      setProofDialogOpen(false);
      setProofFile(null);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.msg || "Error submitting proof");
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
          My OD Requests
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
                <TableCell>Event Name</TableCell>
                <TableCell>Event Date</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Class Advisor</TableCell>
                <TableCell>Approved by Class Advisor?</TableCell>
                <TableCell>Proof Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id}>
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
                  <TableCell>{request.classAdvisor.name}</TableCell>
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
                        request.proofSubmitted ? "Submitted" : "Not Submitted"
                      }
                      className={`status-${
                        request.proofSubmitted ? "submitted" : "pending"
                      }`}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {request.status === "approved" &&
                      !request.proofSubmitted && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => {
                            setSelectedRequest(request);
                            setProofDialogOpen(true);
                          }}
                        >
                          Submit Proof
                        </Button>
                      )}
                    {request.proofSubmitted && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedRequest(request);
                          setViewProofDialogOpen(true);
                        }}
                      >
                        View Proof
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog
          open={proofDialogOpen}
          onClose={() => setProofDialogOpen(false)}
        >
          <DialogTitle>Submit Proof Document</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files[0])}
                style={{ display: "none" }}
                id="proof-file"
              />
              <label htmlFor="proof-file">
                <Button variant="contained" component="span">
                  Select File
                </Button>
              </label>
              {proofFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {proofFile.name}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProofDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleProofSubmit} color="primary">
              Submit
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
              <Box
                sx={{
                  width: "100%",
                  height: "70vh",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "auto",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px",
                  p: 2,
                }}
              >
                {selectedRequest.proofDocument.endsWith(".pdf") ? (
                  <iframe
                    src={selectedRequest.proofDocument}
                    title="Proof Document"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                  />
                ) : (
                  <img
                    src={selectedRequest.proofDocument}
                    alt="Proof Document"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
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
      </Paper>
    </Container>
  );
};

export default ODRequestList;
