import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return <Typography>Loading dashboard...</Typography>;
  }

  if (!user) {
    return <Typography>Please log in to view the dashboard.</Typography>;
  }

  const renderStudentDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" gutterBottom>
              New OD Request
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submit a new On Duty request for attending events or activities.
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              color="primary"
              onClick={() => navigate("/student/od-request")}
            >
              Create Request
            </Button>
          </CardActions>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" gutterBottom>
              My OD Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage your existing OD requests.
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              color="primary"
              onClick={() => navigate("/student/my-requests")}
            >
              View Requests
            </Button>
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFacultyDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" gutterBottom>
              OD Requests Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review and manage student OD requests.
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              color="primary"
              onClick={() => navigate("/faculty/od-requests")}
            >
              Manage Requests
            </Button>
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  );

  const renderHODDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" gutterBottom>
              OD Requests Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage OD requests from students in your department.
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              color="primary"
              onClick={() => navigate("/hod/dashboard")}
            >
              View Requests
            </Button>
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAdminDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" gutterBottom>
              System Administration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage users, departments, and system settings.
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" color="primary" onClick={() => navigate("/admin/management")}>
              Manage System
            </Button>
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDashboardContent = () => {
    switch (user.role) {
      case "student":
        return renderStudentDashboard();
      case "faculty":
        return renderFacultyDashboard();
      case "hod":
        return renderHODDashboard();
      case "admin":
        return renderAdminDashboard();
      default:
        return null;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            OD Application
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Welcome, {user.name} ({user.role})
          </Typography>
          {renderDashboardContent()}
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;
