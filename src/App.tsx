import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
<<<<<<< HEAD
import VisionAgentSettings from "./pages/VisionAgentSettings";
import CompleteProfile from "./pages/CompleteProfile";
import ResetPassword from "./pages/ResetPassword";
=======
>>>>>>> d4f2db7562ab8ca94498ae07d1d3be2fd60bb5ba
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
<<<<<<< HEAD
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
=======
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
>>>>>>> d4f2db7562ab8ca94498ae07d1d3be2fd60bb5ba
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
<<<<<<< HEAD
            <Route
              path="/vision-agent-settings"
              element={
                <ProtectedRoute>
                  <VisionAgentSettings />
                </ProtectedRoute>
              }
            />
=======
>>>>>>> d4f2db7562ab8ca94498ae07d1d3be2fd60bb5ba
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
