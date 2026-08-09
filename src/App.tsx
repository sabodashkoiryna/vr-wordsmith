import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAdmin from './components/RequireAdmin';
import RequireAuth from './components/RequireAuth';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';
import LandingPage from './features/landing/LandingPage';
import GalleryPage from './features/gallery/GalleryPage';
import NotFoundPage from './features/NotFoundPage';
import ModulesPage from './pages/ModulesPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import ResourcesPage from './pages/ResourcesPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ModulesAdmin from './pages/admin/content/ModulesAdmin';
import ResourcesAdmin from './pages/admin/content/ResourcesAdmin';
import DiagnosticsAdmin from './pages/admin/content/DiagnosticsAdmin';
import UsersAdmin from './pages/admin/UsersAdmin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route
              path="/diag"
              element={
                <RequireAuth>
                  <DiagnosticsPage />
                </RequireAuth>
              }
            />
            <Route path="/res" element={<ResourcesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
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
              <Route path="resources" element={<ResourcesAdmin />} />
              <Route path="diagnostics" element={<DiagnosticsAdmin />} />
              <Route path="users" element={<UsersAdmin />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
