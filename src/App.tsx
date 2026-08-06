import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAdmin from './components/RequireAdmin';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ModulesPage from './pages/ModulesPage';
import MatrixPage from './pages/MatrixPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import ExperimentPage from './pages/ExperimentPage';
import ResourcesPage from './pages/ResourcesPage';
import LoginPage from './pages/auth/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ModulesAdmin from './pages/admin/content/ModulesAdmin';
import MatrixAdmin from './pages/admin/content/MatrixAdmin';
import ResourcesAdmin from './pages/admin/content/ResourcesAdmin';
import ExperimentAdmin from './pages/admin/content/ExperimentAdmin';
import DiagnosticsAdmin from './pages/admin/content/DiagnosticsAdmin';
import UsersAdmin from './pages/admin/UsersAdmin';
import ResultsAdmin from './pages/admin/ResultsAdmin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/matrix" element={<MatrixPage />} />
            <Route path="/diag" element={<DiagnosticsPage />} />
            <Route path="/exp" element={<ExperimentPage />} />
            <Route path="/res" element={<ResourcesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="modules" element={<ModulesAdmin />} />
              <Route path="matrix" element={<MatrixAdmin />} />
              <Route path="resources" element={<ResourcesAdmin />} />
              <Route path="experiment" element={<ExperimentAdmin />} />
              <Route path="diagnostics" element={<DiagnosticsAdmin />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="results" element={<ResultsAdmin />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
