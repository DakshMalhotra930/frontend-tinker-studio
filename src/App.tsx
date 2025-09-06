import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Subscription from "./pages/Subscription";
import GoogleLogin from "./components/GoogleLogin";
import { Analytics } from '@vercel/analytics/react';
import { useAuth, User } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  const handleLogin = (userData: User) => {
    login(userData);
  };

  const handleLogout = () => {
    logout();
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
        <div className="bg-zinc-800 rounded-2xl shadow-lg px-10 py-12 flex flex-col items-center">
          <img
            src="/praxis-logo-transparent.png"
            alt="PraxisAI Logo"
            className="h-20 mb-6"
          />
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Enhanced, centered login modal using Tailwind
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
        <div className="bg-zinc-800 rounded-2xl shadow-lg px-10 py-12 flex flex-col items-center">
          <img
            src="/praxis-logo-transparent.png"
            alt="PraxisAI Logo"
            className="h-20 mb-6"
          />
          <h1 className="text-3xl font-extrabold text-white mb-4">
            Sign In to Your Personal AI Tutor
          </h1>
          <p className="text-lg text-zinc-300 mb-8">
            Log in with Google to continue.
          </p>
          {/* You can add scale for Google button if needed */}
          <div className="scale-125">
            <GoogleLogin onLogin={handleLogin} />
          </div>
        </div>
      </div>
    );
  }

  // Show rest of app after authentication
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <Index
                  user={user}
                  onLogout={handleLogout}
                />
              }
            />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
