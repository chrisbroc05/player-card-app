import React from "react";
import { Navigate } from "react-router-dom";
import { ADMIN_TOKEN_STORAGE_KEY } from "../config/api";
import { isAdminTokenValid } from "../utils/adminJwt";

export default function AdminRoute({ children }) {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) : null;
  if (!isAdminTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
