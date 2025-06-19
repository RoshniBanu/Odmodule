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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const ODRequestForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    eventName: "",
    eventDate: null,
    startDate: null,
    endDate: null,
    reason: "",
    timeType: "fullDay",
    startTime: null,
    endTime: null,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/od-requests",
        {
          ...formData,
          classAdvisor: user.facultyAdvisor,
        },
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        }
      );

      setSuccess("OD request submitted successfully");
      setFormData({
        eventName: "",
        eventDate: null,
        startDate: null,
        endDate: null,
        reason: "",
        timeType: "fullDay",
        startTime: null,
        endTime: null,
      });
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
    </Container>
  );
};

export default ODRequestForm;
