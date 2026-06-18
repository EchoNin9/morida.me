import { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';
import { ErrorBoundary } from './ErrorBoundary';
import { PageTransition } from '@/utils/PageTransition';
import { lazyWithReload } from '@/utils/lazyWithReload';

/* ── Eager-loaded: homepage only ── */
import { HomePage } from '@/features/home/HomePage';

/* ── Lazy-loaded feature pages ── */
const UpdatesPage = lazyWithReload(() => import('@/features/updates/UpdatesPage').then(m => ({ default: m.UpdatesPage })));
const PressPage = lazyWithReload(() => import('@/features/press/PressPage').then(m => ({ default: m.PressPage })));
const PressDetailPage = lazyWithReload(() => import('@/features/press/PressDetailPage').then(m => ({ default: m.PressDetailPage })));
const AuthPage = lazyWithReload(() => import('@/features/auth/AuthPage').then(m => ({ default: m.AuthPage })));
const ProfilePage = lazyWithReload(() => import('@/features/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PublicProfilePage = lazyWithReload(() => import('@/features/profile/PublicProfilePage').then(m => ({ default: m.PublicProfilePage })));
const ShowsPage = lazyWithReload(() => import('@/features/shows/ShowsPage'));
const ShowDetailPage = lazyWithReload(() => import('@/features/shows/ShowDetailPage'));
const MediaPage = lazyWithReload(() => import('@/features/media/MediaPage'));
const MediaDetailPage = lazyWithReload(() => import('@/features/media/MediaDetailPage'));

/* ── Lazy-loaded admin pages ── */
const AdminDashboard = lazyWithReload(() => import('@/features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ShowsAdminPage = lazyWithReload(() => import('@/features/admin/ShowsAdminPage'));
const VenuesAdminPage = lazyWithReload(() => import('@/features/admin/VenuesAdminPage'));
const MediaAdminPage = lazyWithReload(() => import('@/features/admin/MediaAdminPage'));
const UpdatesAdminPage = lazyWithReload(() => import('@/features/admin/UpdatesAdminPage').then(m => ({ default: m.UpdatesAdminPage })));
const PressAdminPage = lazyWithReload(() => import('@/features/admin/PressAdminPage').then(m => ({ default: m.PressAdminPage })));
const MembershipPage = lazyWithReload(() => import('@/features/admin/MembershipPage').then(m => ({ default: m.MembershipPage })));
const UsersPage = lazyWithReload(() => import('@/features/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const ApiKeysPage = lazyWithReload(() => import('@/features/admin/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const BrandingAdminPage = lazyWithReload(() => import('@/features/admin/BrandingAdminPage').then(m => ({ default: m.BrandingAdminPage })));

/** Route loading fallback */
function PageLoader() {
  return (
    <div className="container-max section-padding flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-secondary-900">
      <Header />

      <div className="flex-1">
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Routes location={location}>
                {/* Public pages */}
                <Route path="/" element={<HomePage />} />
                <Route path="/updates" element={<UpdatesPage />} />
                <Route path="/press" element={<PressPage />} />
                <Route path="/press/:id" element={<PressDetailPage />} />
                <Route path="/login" element={<AuthPage />} />

                {/* Public shows */}
                <Route path="/shows" element={<ShowsPage />} />
                <Route path="/shows/:id" element={<ShowDetailPage />} />

                {/* Public media */}
                <Route path="/media" element={<MediaPage />} />
                <Route path="/media/:id" element={<MediaDetailPage />} />

                {/* Authenticated */}
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:identifier" element={<PublicProfilePage />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/shows" element={<ShowsAdminPage />} />
                <Route path="/admin/venues" element={<VenuesAdminPage />} />
                <Route path="/admin/media" element={<MediaAdminPage />} />
                <Route path="/admin/updates" element={<UpdatesAdminPage />} />
                <Route path="/admin/press" element={<PressAdminPage />} />
                <Route path="/admin/membership" element={<MembershipPage />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/api-keys" element={<ApiKeysPage />} />
                <Route path="/admin/branding" element={<BrandingAdminPage />} />
              </Routes>
            </PageTransition>
          </AnimatePresence>
        </Suspense>
        </ErrorBoundary>
      </div>

      <Footer />
    </div>
  );
}
