import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      axios.defaults.headers.common["x-auth-token"] = token;

      const fetchUser = async () => {
        try {
          const res = await axios.get("http://localhost:5000/api/auth/me");
          setUser(res.data);
        } catch (err) {
          console.error("Error fetching user:", err);
          if (err.response?.status === 401) {
            localStorage.removeItem("token");
            delete axios.defaults.headers.common["x-auth-token"];
          }
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      axios.defaults.headers.common["x-auth-token"] = token;
      setUser(user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.msg || "Login failed",
      };
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        userData
      );
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      axios.defaults.headers.common["x-auth-token"] = token;
      setUser(user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.msg || "Registration failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["x-auth-token"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
