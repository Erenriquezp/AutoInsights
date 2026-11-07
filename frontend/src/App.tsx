import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from './components/ui';
import { I18nProvider } from './i18n/I18nProvider';
import { AppShell } from './layout/AppShell';

// One chunk per page: a visitor downloads only the charts of the page they open.
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const VehiclePage = lazy(() => import('./pages/VehiclePage'));
const GeographyPage = lazy(() => import('./pages/GeographyPage'));
const AskPage = lazy(() => import('./pages/AskPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppShell>
          <Suspense fallback={<Loading height={320} />}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/vehicle" element={<VehiclePage />} />
              <Route path="/geography" element={<GeographyPage />} />
              <Route path="/ask" element={<AskPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </BrowserRouter>
    </I18nProvider>
  );
}
