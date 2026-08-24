import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/patient"
          element={<PatientDashboard />}
        />

        <Route
          path="/"
          element={
            <Navigate
              to="/patient"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;