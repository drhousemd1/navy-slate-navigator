
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Create empty placeholder pages for our navigation
import Rules from "./pages/Rules";
import Tasks from "./pages/Tasks";
import Rewards from "./pages/Rewards";
import Punishments from "./pages/Punishments";
import ThroneRoom from "./pages/ThroneRoom";

// Create a client with aggressive caching to maintain state between page navigations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/punishments" element={<Punishments />} />
            <Route path="/throne-room" element={<ThroneRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
