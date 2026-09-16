import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import PharmacistDashboard from "./pages/PharmacistDashboard";

function getRole() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

function PrivateRoute({ element, requiredRole }) {
  const role = getRole();
  if (!role) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === "pharmacist" ? "/pharmacist" : "/patient"} replace />;
  }
  return element;
}

function RootRedirect() {
  const role = getRole();
  if (!role) return <Navigate to="/login" replace />;
  return <Navigate to={role === "pharmacist" ? "/pharmacist" : "/patient"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/patient"
          element={<PrivateRoute element={<PatientDashboard />} requiredRole="patient" />}
        />
        <Route
          path="/pharmacist"
          element={<PrivateRoute element={<PharmacistDashboard />} requiredRole="pharmacist" />}
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
