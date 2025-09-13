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

  // Show rest of app with routing
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes - accessible without authentication */}
            <Route path="/pricing" element={<Pricing />} />
            
            {/* Protected routes - require authentication */}
            {isAuthenticated && user ? (
              <>
                <Route
                  path="/"
                  element={
                    <Index
                      user={user}
                      onLogout={handleLogout}
                    />
                  }
                />
                <Route path="/subscription" element={<Subscription />} />
              </>
            ) : (
              // Show login page for protected routes when not authenticated
              <Route
                path="/*"
                element={
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
                      <div className="scale-125">
                        <GoogleLogin onLogin={handleLogin} />
                      </div>
                      <div className="mt-6 text-center">
                        <p className="text-zinc-400 mb-2">Want to see our pricing first?</p>
                        <a 
                          href="/pricing" 
                          className="text-primary hover:text-primary/80 underline"
                        >
                          View Pricing Plans
                        </a>
                      </div>
                    </div>
                  </div>
                }
              />
            )}
            
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
