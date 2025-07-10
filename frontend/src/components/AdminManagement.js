import React, { useState, useEffect, useRef } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Title,
} from "chart.js";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
//import { DateRangePicker } from "@mui/x-date-pickers/DateRangePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { isAfter, isBefore, isEqual, startOfDay, endOfDay } from "date-fns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Contributors from './Contributors';

// Register ChartJS components
ChartJS.register(ArcElement, ChartTooltip, Legend, Title);

const API_BASE_URL = "http://localhost:5000";

const AdminManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("reason");
  const [studentStats, setStudentStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [senderEmail, setSenderEmail] = useState("");
  const [senderEmailPassword, setSenderEmailPassword] = useState("");
  const [senderEmailError, setSenderEmailError] = useState("");
  const [senderEmailPasswordError, setSenderEmailPasswordError] = useState("");
  const [senderEmailLoading, setSenderEmailLoading] = useState(false);
  const senderEmailInputRef = useRef();

  // Popup state
  const [openSenderDialog, setOpenSenderDialog] = useState(false);

  // New filter states
  const [filterStudent, setFilterStudent] = useState("");
  const [filterRegno, setFilterRegno] = useState("");
  const [filterAcademicYear, setFilterAcademicYear] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterYear, setFilterYear] = useState("");
  // Add new filter states for 1st/2nd/3rd/4th year
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterEventType, setFilterEventType] = useState("");
  const [academicYearRange, setAcademicYearRange] = useState([null, null]);

  const [eventTypeRequests, setEventTypeRequests] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventTypeMsg, setEventTypeMsg] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editEventTypeIdx, setEditEventTypeIdx] = useState(null);
  const [editEventTypeValue, setEditEventTypeValue] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEventTypeValue, setDeleteEventTypeValue] = useState("");

  const [autoForwardTimeout, setAutoForwardTimeout] = useState(60);
  const [autoForwardTimeoutInput, setAutoForwardTimeoutInput] = useState(60);
  const [autoForwardTimeoutLoading, setAutoForwardTimeoutLoading] =
    useState(false);
  const [autoForwardTimeoutMsg, setAutoForwardTimeoutMsg] = useState("");

  const allColumns = [
    { label: "Student Name", key: "studentName" },
    { label: "Roll Number", key: "rollNumber" },
    { label: "Event Name", key: "eventName" },
    { label: "Event Type", key: "eventType" },
    { label: "Date", key: "eventDate" },
    { label: "Reason", key: "reason" },
    { label: "Faculty Advisor", key: "facultyAdvisor" },
    { label: "Status", key: "status" },
    { label: "Time Elapsed", key: "timeElapsed" },
  ];
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(
    allColumns.map((col) => col.key)
  );

  const defaultEventTypes = [
    "hackathon",
    "conference",
    "symposium",
    "sports",
    "NSS",
    "workshop",
  ];

  const fetchStudentStats = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/od-requests/admin/student-stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setStudentStats(response.data);
      setStatsLoading(false);
    } catch (err) {
      console.error("Error fetching student stats:", err);
      setError(
        err.response?.data?.message || "Failed to fetch student statistics"
      );
      setStatsLoading(false);
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/od-requests/admin/all`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setRequests(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.response?.data?.message || "Failed to fetch requests");
    }
    setLoading(false);
  };

  // Fetch sender email on mount
  useEffect(() => {
    const fetchSenderEmail = async () => {
      setSenderEmailLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/settings/sender-email`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setSenderEmail(res.data.senderEmail);
        setSenderEmailError("");
      } catch (err) {
        setSenderEmailError("Failed to fetch sender email");
      }
      setSenderEmailLoading(false);
    };
    fetchSenderEmail();
  }, []);

  // Fetch event type requests and event types
  useEffect(() => {
    const fetchEventTypeRequests = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/settings/event-type-requests`,
          { headers: { "x-auth-token": localStorage.getItem("token") } }
        );
        setEventTypeRequests(res.data.requests || []);
      } catch (err) {
        setEventTypeRequests([]);
      }
    };
    const fetchEventTypes = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/settings/event-types`,
          { headers: { "x-auth-token": localStorage.getItem("token") } }
        );
        // Merge backend and default event types, remove duplicates
        const backendTypes =
          Array.isArray(res.data.eventTypes) && res.data.eventTypes.length > 0
            ? res.data.eventTypes
            : [];
        const mergedTypes = Array.from(
          new Set([...defaultEventTypes, ...backendTypes])
        );
        setEventTypes(mergedTypes);
      } catch (err) {
        setEventTypes(defaultEventTypes);
      }
    };
    fetchEventTypeRequests();
    fetchEventTypes();
  }, []);

  useEffect(() => {
    fetchStudentStats();
    fetchAllRequests();
  }, []);

  useEffect(() => {
    const fetchTimeout = async () => {
      try {
        setAutoForwardTimeoutLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/api/settings/auto-forward-faculty-timeout`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setAutoForwardTimeout(res.data.timeout);
        setAutoForwardTimeoutInput(res.data.timeout);
      } catch (err) {
        setAutoForwardTimeoutMsg("Failed to fetch auto-forward timeout");
      } finally {
        setAutoForwardTimeoutLoading(false);
      }
    };
    fetchTimeout();
  }, []);

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchFieldChange = (event) => {
    setSearchField(event.target.value);
  };

  const filteredRequests = requests.filter((request) => {
    // Student Name
    if (
      filterStudent &&
      !(
        (request.student?.user?.name &&
          request.student.user.name
            .toLowerCase()
            .includes(filterStudent.toLowerCase())) ||
        (request.student?.name &&
          request.student.name
            .toLowerCase()
            .includes(filterStudent.toLowerCase()))
      )
    ) {
      return false;
    }
    // Register Number
    if (
      filterRegno &&
      !request.student?.registerNo
        ?.toLowerCase()
        .includes(filterRegno.toLowerCase())
    ) {
      return false;
    }
    // Event Type
    if (filterEventType && request.eventType !== filterEventType) {
      return false;
    }

    // Year Level (dropdown)
    if (
      filterYearLevel &&
      String(request.year) !== filterYearLevel &&
      String(request.year) !==
        (filterYearLevel === "1"
          ? "1st"
          : filterYearLevel === "2"
          ? "2nd"
          : filterYearLevel === "3"
          ? "3rd"
          : filterYearLevel === "4"
          ? "4th"
          : "")
    ) {
      return false;
    }
    // Academic Year
    if (filterAcademicYear) {
      const eventYear = request.eventDate
        ? new Date(request.eventDate).getFullYear().toString()
        : "";
      const startYear = request.startDate
        ? new Date(request.startDate).getFullYear().toString()
        : "";
      const endYear = request.endDate
        ? new Date(request.endDate).getFullYear().toString()
        : "";
      if (
        !eventYear.includes(filterAcademicYear) &&
        !startYear.includes(filterAcademicYear) &&
        !endYear.includes(filterAcademicYear)
      ) {
        return false;
      }
    }
    // Event
    if (
      filterEvent &&
      !request.eventName?.toLowerCase().includes(filterEvent.toLowerCase())
    ) {
      return false;
    }

    // Academic Year (date range)
    if (academicYearRange[0] && academicYearRange[1]) {
      const start = startOfDay(academicYearRange[0]);
      const end = endOfDay(academicYearRange[1]);
      // Check eventDate, startDate, endDate falls within range
      const eventDate = request.eventDate ? new Date(request.eventDate) : null;
      const startDate = request.startDate ? new Date(request.startDate) : null;
      const endDate = request.endDate ? new Date(request.endDate) : null;
      const inRange = (date) =>
        date &&
        (isAfter(date, start) || isEqual(date, start)) &&
        (isBefore(date, end) || isEqual(date, end));
      if (
        !(
          (eventDate && inRange(eventDate)) ||
          (startDate && inRange(startDate)) ||
          (endDate && inRange(endDate))
        )
      ) {
        return false;
      }
    }

    return true;
  });

  const handleForwardToHod = async (requestId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/od-requests/${requestId}/forward-to-hod`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchAllRequests();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to forward request to HOD"
      );
    }
  };

  const getTimeElapsed = (timestamp) => {
    if (!timestamp) return "N/A";
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved_by_advisor":
        return "success";
      case "approved_by_hod":
        return "success";
      case "rejected":
        return "error";
      case "forwarded_to_admin":
        return "warning";
      case "forwarded_to_hod":
        return "info";
      default:
        return "default";
    }
  };

  // Calculate OD requests per year (from eventDate, startDate, or endDate)
  const odRequestsByYear = {};
  requests.forEach((req) => {
    let year = "";
    if (req.eventDate) year = new Date(req.eventDate).getFullYear();
    else if (req.startDate) year = new Date(req.startDate).getFullYear();
    else if (req.endDate) year = new Date(req.endDate).getFullYear();
    if (year) {
      odRequestsByYear[year] = (odRequestsByYear[year] || 0) + 1;
    }
  });
  const odYears = Object.keys(odRequestsByYear).sort();
  const odCounts = odYears.map((y) => odRequestsByYear[y]);

  // Pie chart for OD status (approved, rejected, pending, etc.)
  const statusCounts = requests.reduce((acc, req) => {
    const status = req.status?.replace(/_/g, " ") || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const statusLabels = Object.keys(statusCounts);
  const statusData = statusLabels.map((label) => statusCounts[label]);
  const statusColors = [
    "#4caf50",
    "#f44336",
    "#ff9800",
    "#2196f3",
    "#9c27b0",
    "#607d8b",
  ];

  const statusChartData = {
    labels: statusLabels,
    datasets: [
      {
        data: statusData,
        backgroundColor: statusColors,
        borderWidth: 1,
      },
    ],
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
      title: {
        display: true,
        text: "OD Requests by Status",
        font: {
          size: 16,
        },
      },
    },
  };

  const chartData = {
    labels: odYears.map((y) => `Year ${y}`),
    datasets: [
      {
        data: odCounts,
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
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
        position: "bottom",
      },
      title: {
        display: true,
        text: "OD Requests by Year",
        font: {
          size: 16,
        },
      },
    },
  };

  const handleOpenExcelDialog = () => setExcelDialogOpen(true);
  const handleCloseExcelDialog = () => setExcelDialogOpen(false);
  const handleColumnToggle = (key) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Update Excel export logic
  const handleDownloadExcel = () => {
    const data = filteredRequests.map((request) => {
      const row = {};
      allColumns.forEach((col) => {
        if (!selectedColumns.includes(col.key)) return;
        switch (col.key) {
          case "studentName":
            row[col.label] = request.student?.name || "N/A";
            break;
          case "rollNumber":
            row[col.label] = request.student?.registerNo || "N/A";
            break;
          case "eventName":
            row[col.label] = request.eventName || "N/A";
            break;
          case "eventType":
            row[col.label] = request.eventType || "N/A";
            break;
          case "eventDate":
            row[col.label] = request.eventDate
              ? new Date(request.eventDate).toLocaleDateString()
              : "N/A";
            break;
          case "reason":
            row[col.label] = request.reason || "N/A";
            break;
          case "facultyAdvisor":
            row[col.label] = request.classAdvisor?.name || "N/A";
            break;
          case "status":
            row[col.label] = request.status?.replace(/_/g, " ") || "N/A";
            break;
          case "timeElapsed":
            row[col.label] = getTimeElapsed(
              request.lastStatusChangeAt || request.createdAt
            );
            break;
          default:
            row[col.label] = "";
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OD Requests");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "od-requests.xlsx"
    );
    setExcelDialogOpen(false);
  };

  // Open dialog
  const handleOpenSenderDialog = () => {
    setSenderEmailError("");
    setSenderEmailPasswordError("");
    setOpenSenderDialog(true);
  };

  // Close dialog
  const handleCloseSenderDialog = () => {
    setOpenSenderDialog(false);
    setSenderEmailPassword("");
  };

  // Submit handler
  const handleSenderDialogSubmit = async () => {
    setSenderEmailLoading(true);
    setSenderEmailError("");
    setSenderEmailPasswordError("");
    try {
      // Update sender email
      await axios.put(
        `${API_BASE_URL}/api/settings/sender-email`,
        { senderEmail },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      // Update sender email password
      await axios.put(
        `${API_BASE_URL}/api/settings/sender-email-password`,
        { senderEmailPassword },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setOpenSenderDialog(false);
      setSenderEmailPassword("");
    } catch (err) {
      setSenderEmailError("Failed to update sender email or password");
    }
    setSenderEmailLoading(false);
  };

  // Add this function inside your AdminManagement component
  const handleClearFilters = () => {
    setFilterStudent("");
    setFilterRegno("");
    setFilterYear("");
    setFilterYearLevel("");
    setFilterAcademicYear("");
    setFilterEvent("");
    setFilterEventType("");
    setAcademicYearRange([null, null]);
  };

  const handleAcceptEventType = async (eventType, idx) => {
    setEventTypeMsg("");
    const finalEventType = eventTypeRequests[idx]?.eventType || eventType;
    try {
      await axios.post(
        `${API_BASE_URL}/api/settings/event-types`,
        { eventType: finalEventType },
        { headers: { "x-auth-token": localStorage.getItem("token") } }
      );
      // Remove the request from the backend
      await axios.delete(`${API_BASE_URL}/api/settings/event-type-requests`, {
        data: { eventType: finalEventType },
        headers: { "x-auth-token": localStorage.getItem("token") },
      });
      // Remove the request from the list
      const updatedRequests = [...eventTypeRequests];
      updatedRequests.splice(idx, 1);
      setEventTypeRequests(updatedRequests);
      setEventTypeMsg(`Added '${finalEventType}' to event types.`);
      // Refresh event types
      const res = await axios.get(`${API_BASE_URL}/api/settings/event-types`, {
        headers: { "x-auth-token": localStorage.getItem("token") },
      });
      setEventTypes(res.data.eventTypes || []);
    } catch (err) {
      setEventTypeMsg(
        err.response?.data?.message || "Failed to add event type."
      );
    }
  };

  const handleRejectEventType = async (idx) => {
    setEventTypeMsg("");
    // Remove from backend
    try {
      await axios.delete(`${API_BASE_URL}/api/settings/event-type-requests`, {
        data: { eventType: eventTypeRequests[idx].eventType },
        headers: { "x-auth-token": localStorage.getItem("token") },
      });
    } catch (err) {}
    // Remove from UI
    const updatedRequests = [...eventTypeRequests];
    updatedRequests.splice(idx, 1);
    setEventTypeRequests(updatedRequests);
    setEventTypeMsg("Request rejected.");
  };

  const handleOpenEditDialog = (idx) => {
    setEditEventTypeIdx(idx);
    setEditEventTypeValue(eventTypeRequests[idx].eventType);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditEventTypeIdx(null);
    setEditEventTypeValue("");
  };

  const handleSaveEditEventType = () => {
    if (editEventTypeIdx !== null) {
      const updatedRequests = [...eventTypeRequests];
      updatedRequests[editEventTypeIdx].eventType = editEventTypeValue;
      setEventTypeRequests(updatedRequests);
    }
    handleCloseEditDialog();
  };

  const handleOpenDeleteDialog = (eventType) => {
    setDeleteEventTypeValue(eventType);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteEventTypeValue("");
  };

  const handleDeleteEventType = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/settings/event-types`, {
        data: { eventType: deleteEventTypeValue },
        headers: { "x-auth-token": localStorage.getItem("token") },
      });
      setEventTypes(eventTypes.filter((et) => et !== deleteEventTypeValue));
      setDeleteDialogOpen(false);
      setDeleteEventTypeValue("");
      setEventTypeMsg(`Deleted '${deleteEventTypeValue}' from event types.`);
    } catch (err) {
      setEventTypeMsg(
        err.response?.data?.message || "Failed to delete event type."
      );
    }
  };

  const handleUpdateTimeout = async () => {
    setAutoForwardTimeoutLoading(true);
    setAutoForwardTimeoutMsg("");
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/settings/auto-forward-faculty-timeout`,
        { timeout: Number(autoForwardTimeoutInput) },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setAutoForwardTimeout(res.data.timeout);
      setAutoForwardTimeoutMsg("Timeout updated successfully");
    } catch (err) {
      setAutoForwardTimeoutMsg(
        err.response?.data?.message || "Failed to update timeout"
      );
    } finally {
      setAutoForwardTimeoutLoading(false);
    }
  };

  if (loading || statsLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Admin Management
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                OD Requests by Year
              </Typography>
              <Box sx={{ height: 300, position: "relative" }}>
                {odYears.length > 0 ? (
                  <Pie data={chartData} options={chartOptions} />
                ) : (
                  <Alert severity="info">No OD request data available</Alert>
                )}
              </Box>
              {/* Statistics summary below the pie chart */}
              <Box sx={{ mt: 2 }}>
                {odYears.length > 0 ? (
                  odYears.map((year, idx) => (
                    <Typography key={year} variant="body1" gutterBottom>
                      {`Year ${year}`}: {odCounts[idx]}
                    </Typography>
                  ))
                ) : (
                  <Alert severity="info">No statistics available</Alert>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                OD Requests by Status
              </Typography>
              <Box sx={{ height: 300, position: "relative" }}>
                {statusLabels.length > 0 ? (
                  <Pie data={statusChartData} options={statusChartOptions} />
                ) : (
                  <Alert severity="info">
                    No OD request status data available
                  </Alert>
                )}
              </Box>
              {/* Statistics summary below the pie chart */}
              <Box sx={{ mt: 2 }}>
                {statusLabels.length > 0 ? (
                  statusLabels.map((label, idx) => (
                    <Typography key={label} variant="body1" gutterBottom>
                      {label}: {statusCounts[label]}
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

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            color="success"
            onClick={handleOpenExcelDialog}
            sx={{ ml: 2 }}
          >
            Download Excel
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Sender Email Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sender Email Settings
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenSenderDialog}
            >
              Change Sender Email
            </Button>
          </Box>
          {senderEmailError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {senderEmailError}
            </Alert>
          )}
        </Paper>

        {/* Sender Email Change Dialog */}
        <Dialog open={openSenderDialog} onClose={handleCloseSenderDialog}>
          <DialogTitle>Change Sender Email</DialogTitle>
          <DialogContent>
            <TextField
              label="Sender Email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Sender Email Password"
              type="password"
              value={senderEmailPassword}
              onChange={(e) => setSenderEmailPassword(e.target.value)}
              fullWidth
              margin="normal"
            />
            {senderEmailError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {senderEmailError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSenderDialog}>Cancel</Button>
            <Button
              onClick={handleSenderDialogSubmit}
              variant="contained"
              color="primary"
              disabled={
                senderEmailLoading || !senderEmail || !senderEmailPassword
              }
            >
              {senderEmailLoading ? "Saving..." : "Submit"}
            </Button>
          </DialogActions>
        </Dialog>

        <Grid container spacing={2} sx={{ mb: 3, alignItems: "end" }}>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              variant="outlined"
              label="Student Name"
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              variant="outlined"
              label="Register Number"
              value={filterRegno}
              onChange={(e) => setFilterRegno(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              variant="outlined"
              label="Year Level"
              value={filterYearLevel}
              onChange={(e) => setFilterYearLevel(e.target.value)}
            >
              <MenuItem value="">All Years</MenuItem>
              <MenuItem value="1">1st Year</MenuItem>
              <MenuItem value="2">2nd Year</MenuItem>
              <MenuItem value="3">3rd Year</MenuItem>
              <MenuItem value="4">4th Year</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Academic Year Start"
                    value={academicYearRange[0]}
                    onChange={(newValue) =>
                      setAcademicYearRange([newValue, academicYearRange[1]])
                    }
                    renderInput={(params) => (
                      <TextField {...params} fullWidth size="small" />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="Academic Year End"
                    value={academicYearRange[1]}
                    onChange={(newValue) =>
                      setAcademicYearRange([academicYearRange[0], newValue])
                    }
                    renderInput={(params) => (
                      <TextField {...params} fullWidth size="small" />
                    )}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              variant="outlined"
              label="Event"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              variant="outlined"
              label="Event Type"
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
            >
              <MenuItem value="">All Event Types</MenuItem>
              {eventTypes.map((et) => (
                <MenuItem key={et} value={et}>
                  {et.charAt(0).toUpperCase() + et.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
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
                  <TableCell>Event Name</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Faculty Advisor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time Elapsed</TableCell>
                  <TableCell>Brochure</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>{request.student?.name || "N/A"}</TableCell>
                    <TableCell>
                      {request.student?.registerNo || "N/A"}
                    </TableCell>
                    <TableCell>{request.eventName || "N/A"}</TableCell>
                    <TableCell>{request.eventType || "N/A"}</TableCell>
                    <TableCell>
                      {request.eventDate
                        ? new Date(request.eventDate).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={request.reason || "No reason provided"}>
                        <Typography noWrap style={{ maxWidth: 200 }}>
                          {request.reason || "N/A"}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{request.classAdvisor?.name || "N/A"}</TableCell>
                    <TableCell>
                      <Chip
                        label={request.status?.replace(/_/g, " ") || "N/A"}
                        color={getStatusColor(request.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {getTimeElapsed(
                        request.lastStatusChangeAt || request.createdAt
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
                        >
                          View Brochure
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.status === "forwarded_to_admin" && (
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

        {/* Event Type Requests Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Event Type Requests
          </Typography>
          {eventTypeMsg && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {eventTypeMsg}
            </Alert>
          )}
          {eventTypeRequests.length === 0 ? (
            <Alert severity="success">No pending event type requests.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Requested Event Type</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventTypeRequests.map((req, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {req.eventType}
                          <IconButton
                            size="small"
                            sx={{ ml: 1 }}
                            onClick={() => handleOpenEditDialog(idx)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {req.date ? new Date(req.date).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                          onClick={() =>
                            handleAcceptEventType(req.eventType, idx)
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleRejectEventType(idx)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Event Types Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Event Types
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventTypes.map((et, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{et}</TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => handleOpenDeleteDialog(et)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box sx={{ mb: 3, p: 2, border: "1px solid #eee", borderRadius: 2 }}>
          <Typography variant="h6">Auto-Forward Faculty Timeout</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
            <TextField
              label="Timeout (minutes)"
              type="number"
              value={autoForwardTimeoutInput}
              onChange={(e) => setAutoForwardTimeoutInput(e.target.value)}
              size="small"
              inputProps={{ min: 1 }}
              disabled={autoForwardTimeoutLoading}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpdateTimeout}
              disabled={
                autoForwardTimeoutLoading || Number(autoForwardTimeoutInput) < 1
              }
            >
              Update
            </Button>
            <Typography variant="body2" color="text.secondary">
              Current: {autoForwardTimeout} min
            </Typography>
          </Box>
          {autoForwardTimeoutMsg && (
            <Alert
              severity={
                autoForwardTimeoutMsg.includes("success") ? "success" : "error"
              }
              sx={{ mt: 1 }}
            >
              {autoForwardTimeoutMsg}
            </Alert>
          )}
        </Box>
      </Box>

      {/* Contributors Section */}
      <Box sx={{ marginTop: 'auto', mb: 2 }}>
        <Contributors />
      </Box>

      {/* Edit Event Type Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Event Type Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Type Name"
            type="text"
            fullWidth
            value={editEventTypeValue}
            onChange={(e) => setEditEventTypeValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleSaveEditEventType}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Event Type Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Event Type</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete '{deleteEventTypeValue}' from event
            types?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            onClick={handleDeleteEventType}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Excel Dialog */}
      <Dialog open={excelDialogOpen} onClose={handleCloseExcelDialog}>
        <DialogTitle>Select Columns to Export</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {allColumns.map((col) => (
              <Box key={col.key} sx={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col.key)}
                  onChange={() => handleColumnToggle(col.key)}
                  id={`col-checkbox-${col.key}`}
                />
                <label
                  htmlFor={`col-checkbox-${col.key}`}
                  style={{ marginLeft: 8 }}
                >
                  {col.label}
                </label>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExcelDialog}>Cancel</Button>
          <Button
            onClick={handleDownloadExcel}
            variant="contained"
            color="success"
            disabled={selectedColumns.length === 0}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdminManagement;
