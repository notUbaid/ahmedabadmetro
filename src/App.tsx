import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OfflineIndicator from "@/components/OfflineIndicator";
import { MetroCardProvider } from "@/contexts/MetroCardContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { Analytics } from "@vercel/analytics/react";

import { AppSplash } from "@/components/AppSplash";

// Lazy load pages for better initial load
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
        <AppSplash />
        <WelcomeOverlay />
        <OfflineIndicator />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<AppSplash isSuspenseFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Analytics />
      </MetroCardProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
