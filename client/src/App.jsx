import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutProvider } from './context/LayoutContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { WidgetBankProvider } from './context/WidgetBankContext';
import { SettingsProvider } from './context/SettingsContext';
import { EditModeProvider } from './context/EditModeContext';
import { DataProvider, useData } from './context/DataContext';
import AppShell from './components/AppShell';
import FileLoader from './components/FileLoader';
import LoginPage from './pages/LoginPage';
import MainDashboard from './pages/MainDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import QADashboard from './pages/QADashboard';
import SettingsPage from './pages/SettingsPage';
import SystemDocsPage from './pages/SystemDocsPage';
import PreferencesPage from './pages/PreferencesPage';
import SubDashboardPage from './pages/SubDashboardPage';
import FormulaVerifierPage from './pages/FormulaVerifierPage';
import WidgetBuilderPage from './pages/WidgetBuilderPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--p-accent)', borderTopColor: 'transparent' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'Admin') return <Navigate to="/" replace />;
  return children;
}

/** Gates access to the dashboard — shows FileLoader as its own screen until data is ready. */
function DataGate({ children }) {
  const { needsFiles } = useData();
  if (needsFiles) return <FileLoader />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DataGate><AppShell /></DataGate></ProtectedRoute>}>
        <Route index element={<MainDashboard />} />
        <Route path="delivery"       element={<DeliveryDashboard />} />
        <Route path="qa"             element={<QADashboard />} />
        <Route path="preferences"    element={<PreferencesPage />} />
        <Route path="sub/:id"        element={<SubDashboardPage />} />
        <Route path="system-docs"    element={<ProtectedRoute adminOnly><SystemDocsPage /></ProtectedRoute>} />
        <Route path="settings"       element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
        <Route path="formula-verify"      element={<ProtectedRoute adminOnly><FormulaVerifierPage /></ProtectedRoute>} />
        <Route path="widget-builder"      element={<WidgetBuilderPage />} />
        <Route path="widget-builder/:id"  element={<WidgetBuilderPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LayoutProvider>
        <SettingsProvider>
          <LanguageProvider>
            <ThemeProvider>
              <DataProvider>
                <WidgetBankProvider>
                  <EditModeProvider>
                    <AppRoutes />
                  </EditModeProvider>
                </WidgetBankProvider>
              </DataProvider>
            </ThemeProvider>
          </LanguageProvider>
        </SettingsProvider>
      </LayoutProvider>
    </AuthProvider>
  );
}
