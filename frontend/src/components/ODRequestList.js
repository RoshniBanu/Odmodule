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
  Autocomplete,
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import axios from "axios";

const ODRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [viewProofDialogOpen, setViewProofDialogOpen] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchRequests();
    fetchFacultyList();
  }, []);

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
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        return;
      }

      const res = await axios.get(
        "http://localhost:5000/api/od-requests/student",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Fetched requests:", res.data); // Debug log
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.response?.data?.message || "Error fetching requests");
    }
  };

  const fetchFacultyList = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        return;
      }

      const response = await axios.get(
        "http://localhost:5000/api/users/faculty",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setFacultyList(response.data);
    } catch (error) {
      console.error("Error fetching faculty list:", error);
      setError("Failed to fetch faculty list");
    }
  };

  const handleProofSubmit = async () => {
    if (!proofFile) {
      setError("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("proofDocument", proofFile);
    formData.append(
      "notifyFaculty",
      JSON.stringify(selectedFaculty.map((f) => f._id))
    );

    try {
      const response = await axios.post(
        `http://localhost:5000/api/od-requests/${selectedRequest._id}/submit-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setRequests(
        requests.map((req) =>
          req._id === response.data._id ? response.data : req
        )
      );
      setProofDialogOpen(false);
      setProofFile(null);
      setSelectedFaculty([]);
    } catch (error) {
      console.error("Error submitting proof:", error);
    }
  };

  const handleDownloadPDF = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/api/od-requests/${requestId}/download-approved-pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element and trigger the download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `od_request_${requestId}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      setError(err.response?.data?.message || "Error downloading PDF");
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

  // Update the handleSubmitProof function
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("proofDocument", selectedFile);
    formData.append(
      "notifyFaculty",
      JSON.stringify(selectedFaculty.map((f) => f._id))
    );

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/od-requests/${selectedRequest._id}/submit-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccess("Proof submitted successfully");
      setRequests(
        requests.map((req) =>
          req._id === response.data._id ? response.data : req
        )
      );
      handleCloseProofDialog();
      fetchRequests();
    } catch (error) {
      console.error("Error submitting proof:", error);
      setError(error.response?.data?.message || "Error submitting proof");
    }
  };
  const handleCloseProofDialog = () => {
    setProofDialogOpen(false);
    setProofFile(null);
    setSelectedFaculty([]);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are allowed for proof submission.");
        setSelectedFile(null);
        return;
      }
      setError("");
      setSelectedFile(file);
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
                <TableCell>Status</TableCell>
                <TableCell>Proof Verification Status</TableCell>
                <TableCell>Brochure</TableCell>
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
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
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
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {request.status === "approved_by_hod" &&
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
                      {request.status === "approved_by_hod" && (
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          onClick={() => handleDownloadPDF(request._id)}
                          startIcon={<DownloadIcon />}
                        >
                          Download PDF
                        </Button>
                      )}
                      {request.proofDocument && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewProof(request.proofDocument)}
                        >
                          View Proof
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog
          open={proofDialogOpen}
          onClose={handleCloseProofDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Submit Proof Document</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                style={{ marginBottom: "1rem" }}
              />
              <Autocomplete
                multiple
                options={facultyList}
                getOptionLabel={(option) => option.name}
                value={selectedFaculty}
                onChange={(event, newValue) => {
                  setSelectedFaculty(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Faculty to Notify"
                    placeholder="Select faculty members"
                    fullWidth
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProofDialog}>Cancel</Button>
            <Button
              onClick={handleSubmitProof}
              variant="contained"
              color="primary"
            >
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
                  height: "80vh",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  bgcolor: "#f5f5f5",
                  borderRadius: 1,
                  p: 2,
                }}
              >
                {selectedRequest.proofDocument
                  .toLowerCase()
                  .endsWith(".pdf") ? (
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
      </Paper>
    </Container>
  );
};

export default ODRequestList;
