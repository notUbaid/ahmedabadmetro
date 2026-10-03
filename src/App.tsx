import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OfflineIndicator from "@/components/OfflineIndicator";
import UpdateBanner from "@/components/UpdateBanner";
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
        <UpdateBanner />
        <Sonner position="top-center" richColors />
        <BrowserRouter>
          <Suspense fallback={<AppSplash isSuspenseFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/map" element={<Index />} />
              <Route path="/stations" element={<Index />} />
              <Route path="/routes" element={<Index />} />
              <Route path="/route" element={<Index />} />
              <Route path="/fare" element={<Index />} />
              <Route path="/fare-chart" element={<Index />} />
              <Route path="/timings" element={<Index />} />
              <Route path="/airport" element={<Index />} />
              <Route path="/parking" element={<Index />} />
              <Route path="/interchange" element={<Index />} />
              <Route path="/station/:stationSlug" element={<Index />} />
              <Route path="/route/:routeSlug" element={<Index />} />
              <Route path="/line/:lineSlug" element={<Index />} />
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
