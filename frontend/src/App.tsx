import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import Goals from "./pages/Goals";
import ActivityLogs from "./pages/ActivityLogs";
import Customers from "./pages/Customers";
import Dues from "./pages/Dues";
import AiTracker from "./pages/AiTracker";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { themeService } from "@/services/themeService";

import { StaffRestrictedRoute } from "@/components/StaffRestrictedRoute";
import { VersionUpdateBanner } from "@/components/VersionUpdateBanner";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo(0, 0);
      }
    } catch {
      // Safe fallback for testing environments (jsdom)
    }
  }, [pathname]);
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  useEffect(() => {
    themeService.applyAccent();
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <VersionUpdateBanner />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Allowed for all roles (Staff + Owner) */}
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/customers" element={<Customers />} />

            {/* Restricted for Staff (Redirects to /transactions) */}
            <Route path="/dashboard" element={<StaffRestrictedRoute><Dashboard /></StaffRestrictedRoute>} />
            <Route path="/settings" element={<StaffRestrictedRoute><Settings /></StaffRestrictedRoute>} />
            <Route path="/admin" element={<StaffRestrictedRoute><Admin /></StaffRestrictedRoute>} />
            <Route path="/analytics" element={<StaffRestrictedRoute><Analytics /></StaffRestrictedRoute>} />
            <Route path="/analytics/predictions" element={<StaffRestrictedRoute><Analytics defaultTab="predictions" /></StaffRestrictedRoute>} />
            <Route path="/goals" element={<StaffRestrictedRoute><Goals /></StaffRestrictedRoute>} />
            <Route path="/ai-tracker" element={<StaffRestrictedRoute><AiTracker /></StaffRestrictedRoute>} />
            <Route path="/predictions" element={<StaffRestrictedRoute><AiTracker /></StaffRestrictedRoute>} />
            <Route path="/dues" element={<StaffRestrictedRoute><Dues /></StaffRestrictedRoute>} />
            <Route path="/activity-logs" element={<StaffRestrictedRoute><ActivityLogs /></StaffRestrictedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
