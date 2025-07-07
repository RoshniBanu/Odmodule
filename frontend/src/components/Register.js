import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    year: "",
    facultyAdvisor: "",
    registerNo: "",
    department: "CSE" // Add default department
  });
  const [error, setError] = useState("");
  const [facultyAdvisors, setFacultyAdvisors] = useState([]);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFacultyAdvisors = async () => {
      try {
        console.log("Fetching faculty advisors...");
        const res = await axios.get(
          "http://localhost:5000/api/users/public/faculty"
        );
        console.log("Faculty advisors response:", res.data);

        if (res.data && Array.isArray(res.data)) {
          if (res.data.length === 0) {
            setError(
              "No faculty advisors found. Please contact the administrator."
            );
          } else {
            setFacultyAdvisors(res.data);
            setError(""); // Clear any previous errors
          }
        } else {
          console.error("Invalid response format:", res.data);
          setError("Invalid response format from server");
        }
      } catch (err) {
        console.error("Error fetching faculty advisors:", err);
        setError(
          err.response?.data?.message ||
            "Error fetching faculty advisors. Please try again later."
        );
      }
    };

    if (formData.role === "student") {
      fetchFacultyAdvisors();
    } else {
      setFacultyAdvisors([]); // Clear advisors when not a student
    }
  }, [formData.role]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await register(formData);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" gutterBottom align="center">
          Register
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              label="Role"
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="faculty">Faculty</MenuItem>
              <MenuItem value="hod">HOD</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          {/* Remove department field for students */}
          {(formData.role === "faculty" || formData.role === "hod") && (
            <TextField
              fullWidth
              label="Department"
              name="department"
              value={formData.department || ""}
              onChange={handleChange}
              margin="normal"
              required
            />
          )}
          {formData.role === "student" && (
            <>
              <TextField
                fullWidth
                label="Register Number"
                name="registerNo"
                value={formData.registerNo}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Department"
                name="department"
                value="Computer Science and Engineering"
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Faculty Advisor</InputLabel>
                <Select
                  name="facultyAdvisor"
                  value={formData.facultyAdvisor}
                  onChange={handleChange}
                  label="Faculty Advisor"
                >
                  {facultyAdvisors.map((advisor) => (
                    <MenuItem key={advisor._id} value={advisor._id}>
                      {advisor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
          >
            Register
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
