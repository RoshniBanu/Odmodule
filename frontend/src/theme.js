import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#60a5fa", // Light blue
    },
    secondary: {
      main: "#c084fc", // Purple
    },
    background: {
      default: "#1e293b", // Lighter thanrgb(99, 142, 243)
      paper: "#334155", // Lighter thanrgb(130, 165, 221)
      card: "#475569", // Lighter thanrgb(128, 159, 202)
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      color: "#f1f5f9",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      color: "#f1f5f9",
    },
    body1: {
      fontSize: "1rem",
      color: "#e2e8f0",
    },
    body2: {
      fontSize: "0.875rem",
      color: "#cbd5e1",
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(90deg,rgb(148, 187, 245) 0%,rgb(52, 59, 68) 100%)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "linear-gradient(145deg,rgb(145, 180, 233) 0%,rgb(90, 100, 114) 100%)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "linear-gradient(145deg,rgb(57, 82, 115) 0%, #475569 100%)",
          color: "#f1f5f9",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            background: "linear-gradient(145deg,rgb(80, 103, 136) 0%, #334155 100%)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          textTransform: "none",
          padding: "10px 20px",
          fontWeight: 600,
          background: "linear-gradient(to right, #60a5fa, #3b82f6)",
          color: "#fff",
          "&:hover": {
            background: "linear-gradient(to right, #3b82f6, #2563eb)",
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e293b",
          color: "#f1f5f9",
          padding: "10px",
          borderRadius: "4px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputLabel-root": {
            color: "#94a3b8",
          },
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#334155",
            },
            "&:hover fieldset": {
              borderColor: "#60a5fa",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#60a5fa",
            },
          },
        },
      },
    },
  },
});

export default theme;
