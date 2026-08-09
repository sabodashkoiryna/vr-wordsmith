import { lazy, Suspense } from 'react';
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

// Кабінет тягне за собою react-markdown. Він потрібен лише залогіненим і лише
// в уроці, тож іде окремим чанком — інакше кожен відвідувач лендінгу
// завантажував би парсер markdown, який йому нема де застосувати.
const LearnPage = lazy(() => import('./features/learn/LearnPage'));
const LessonPage = lazy(() => import('./features/learn/LessonPage'));

function Loading() {
  return (
    <section className="container-content py-24">
      <p className="text-ink-mute">Завантажуємо…</p>
    </section>
  );
}

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
            <Route
              path="/learn"
              element={
                <RequireAuth>
                  <Suspense fallback={<Loading />}>
                    <LearnPage />
                  </Suspense>
                </RequireAuth>
              }
            />
            <Route
              path="/learn/:moduleOrder/:lessonSlug"
              element={
                <RequireAuth>
                  <Suspense fallback={<Loading />}>
                    <LessonPage />
                  </Suspense>
                </RequireAuth>
              }
            />
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
