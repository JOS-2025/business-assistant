import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Products from "./pages/Products";
import Debts from "./pages/Debts";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import WhatsApp from "./pages/WhatsApp";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import MfaVerify from "./pages/MfaVerify";
import PredictiveAnalytics from "./pages/PredictiveAnalytics";
import CustomerEngagement from "./pages/CustomerEngagement";
import SupplierIntelligence from "./pages/SupplierIntelligence";
import Storefront from "./pages/Storefront";
import CashFlow from "./pages/CashFlow";
import Policies from "./pages/Policies";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, aal, loading } = useAuth();
  const location = useLocation();
  const [mfaRequired, setMfaRequired] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!user || !supabase) return;

    const checkMfa = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;

        // If nextLevel is aal2, it means the user has MFA enrolled but hasn't verified yet
        if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
          setMfaRequired(true);
        } else {
          setMfaRequired(false);
        }
      } catch (err) {
        console.error("MFA check failed:", err);
        setMfaRequired(false);
      }
    };

    checkMfa();
  }, [user, aal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (mfaRequired === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (mfaRequired && location.pathname !== '/mfa-verify') {
    return <Navigate to="/mfa-verify" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/mfa-verify" element={
                <ProtectedRoute>
                  <MfaVerify />
                </ProtectedRoute>
              } />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="chat" element={<Chat />} />
                <Route path="profile" element={<Profile />} />
                <Route path="products" element={<Products />} />
                <Route path="debts" element={<Debts />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="reports" element={<Reports />} />
                <Route path="customers" element={<Customers />} />
                <Route path="whatsapp" element={<WhatsApp />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
                <Route path="predictive-analytics" element={<PredictiveAnalytics />} />
                <Route path="customer-engagement" element={<CustomerEngagement />} />
                <Route path="supplier-intelligence" element={<SupplierIntelligence />} />
                <Route path="storefront" element={<Storefront />} />
                <Route path="cash-flow" element={<CashFlow />} />
                <Route path="policies" element={<Policies />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

