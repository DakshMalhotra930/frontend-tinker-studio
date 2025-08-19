import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GoogleLogin from "./components/GoogleLogin";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null);

  const handleLogout = () => setUser(null);

  // Enhanced, centered login modal using Tailwind
  if (!user) {
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
            <GoogleLogin onLogin={setUser} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
