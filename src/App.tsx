import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OfflineIndicator from "@/components/OfflineIndicator";
import { MetroCardProvider } from "@/contexts/MetroCardContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { Analytics } from "@vercel/analytics/react";

import { Train } from "lucide-react";

// Lazy load pages for better initial load
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 animate-pulse">
        <Train className="w-8 h-8 text-primary animate-bounce" style={{ animationDuration: '2s' }} />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Starting Metro...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <MetroCardProvider>
        <TooltipProvider>
          <WelcomeOverlay />
          <OfflineIndicator />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Analytics />
        </TooltipProvider>
      </MetroCardProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
