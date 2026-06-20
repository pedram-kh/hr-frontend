import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AdminShell } from './shells/AdminShell';
import { EmployeeShell } from './shells/EmployeeShell';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Employee chat shell — separate protected route tree */}
      <Route
        path="/app"
        element={
          <ProtectedRoute accountType="employee">
            <EmployeeShell />
          </ProtectedRoute>
        }
      />

      {/* Admin console shell — separate protected route tree */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute accountType="admin">
            <AdminShell />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
