import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

const ODRequestForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    eventName: "",
    eventType: "hackathon",
    eventDate: null,
    startDate: null,
    endDate: null,
    reason: "",
    timeType: "fullDay",
    startTime: null,
    endTime: null,
  });
  const [eventTypes, setEventTypes] = useState(["hackathon"]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [brochureFile, setBrochureFile] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestedEventType, setRequestedEventType] = useState("");
  const [requestEventTypeMsg, setRequestEventTypeMsg] = useState("");

  useEffect(() => {
    // Fetch event types from backend
    const fetchEventTypes = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/settings/event-types", {
          headers: { "x-auth-token": localStorage.getItem("token") },
        });
        setEventTypes(res.data.eventTypes || ["hackathon"]);
      } catch (err) {
        setEventTypes(["hackathon"]);
      }
    };
    fetchEventTypes();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (field) => (date) => {
    setFormData({
      ...formData,
      [field]: date,
    });
  };

  const handleTimeChange = (field) => (time) => {
    setFormData({
      ...formData,
      [field]: time,
    });
  };

  const handleBrochureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ["application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setError("Only PDF files are allowed for brochure.");
        setBrochureFile(null);
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        setError("Brochure file size must be less than 1MB.");
        setBrochureFile(null);
        return;
      }
      setError("");
      setBrochureFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Frontend validation for required fields
    if (
      !formData.eventName ||
      !formData.eventType ||
      !formData.eventDate ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.reason
    ) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          // Convert Date objects to ISO strings
          if (value instanceof Date && !isNaN(value)) {
            form.append(key, value.toISOString());
          } else {
            form.append(key, value);
          }
        }
      });
      if (brochureFile) {
        form.append("brochure", brochureFile);
      }
      form.append("classAdvisor", user.facultyAdvisor);
      const response = await axios.post(
        "http://localhost:5000/api/od-requests",
        form,
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setSuccess("OD request submitted successfully");
      setFormData({
        eventName: "",
        eventType: "hackathon",
        eventDate: null,
        startDate: null,
        endDate: null,
        reason: "",
        timeType: "fullDay",
        startTime: null,
        endTime: null,
      });
      setBrochureFile(null);
    } catch (err) {
      setError(err.response?.data?.message || "Error submitting OD request");
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Submit OD Request
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

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Event Name"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControl fullWidth required>
                  <InputLabel id="event-type-label">Event Type</InputLabel>
                  <Select
                    labelId="event-type-label"
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    label="Event Type"
                    onChange={handleChange}
                  >
                    {eventTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Tooltip title="Request new event type">
                  <IconButton
                    size="small"
                    sx={{ ml: 1 }}
                    onClick={() => setRequestDialogOpen(true)}
                  >
                    <AddCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Event Date"
                value={formData.eventDate}
                onChange={handleDateChange("eventDate")}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={handleDateChange("startDate")}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DatePicker
                label="End Date"
                value={formData.endDate}
                onChange={handleDateChange("endDate")}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <Typography variant="subtitle1" gutterBottom>
                  Time Selection
                </Typography>
                <RadioGroup
                  row
                  name="timeType"
                  value={formData.timeType}
                  onChange={handleChange}
                >
                  <FormControlLabel
                    value="fullDay"
                    control={<Radio />}
                    label="Full Day"
                  />
                  <FormControlLabel
                    value="particularHours"
                    control={<Radio />}
                    label="Particular Hours"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.timeType === "particularHours" && (
              <>
                <Grid item xs={12} sm={6}>
                  <TimePicker
                    label="From Time"
                    value={formData.startTime}
                    onChange={handleTimeChange("startTime")}
                    slotProps={{
                      textField: { fullWidth: true, required: true },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TimePicker
                    label="To Time"
                    value={formData.endTime}
                    onChange={handleTimeChange("endTime")}
                    slotProps={{
                      textField: { fullWidth: true, required: true },
                    }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                multiline
                rows={4}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Upload Event Brochure (PDF, max 1MB)
              </Typography>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleBrochureChange}
                style={{ marginBottom: '1rem' }}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
              >
                Submit Request
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)}>
        <DialogTitle>Request New Event Type</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Type Name"
            type="text"
            fullWidth
            value={requestedEventType}
            onChange={e => setRequestedEventType(e.target.value)}
          />
          {requestEventTypeMsg && <Alert severity="info" sx={{ mt: 2 }}>{requestEventTypeMsg}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              setRequestEventTypeMsg("");
              if (!requestedEventType.trim()) {
                setRequestEventTypeMsg("Please enter an event type name.");
                return;
              }
              try {
                await axios.post(
                  "http://localhost:5000/api/settings/event-type-requests",
                  { eventType: requestedEventType },
                  { headers: { "x-auth-token": localStorage.getItem("token") } }
                );
                setRequestEventTypeMsg("Request submitted to admin.");
                setRequestedEventType("");
              } catch (err) {
                setRequestEventTypeMsg(
                  err.response?.data?.message || "Failed to submit request."
                );
              }
            }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ODRequestForm;
