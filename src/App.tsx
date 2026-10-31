import { lazy, Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import OfflineIndicator from "@/components/OfflineIndicator";
import UpdateBanner from "@/components/UpdateBanner";
import { MetroCardProvider } from "@/contexts/MetroCardContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { Analytics } from "@vercel/analytics/react";
import { stationToSlug } from "@/lib/seoRoutes";

import { AppSplash } from "@/components/AppSplash";

/**
 * Dynamically synchronizes <link rel="canonical"> to consolidate query URLs (?from=...&to=...)
 * and line aliases into pre-rendered static paths.
 */
function CanonicalHead() {
  const location = useLocation();

  useEffect(() => {
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }

    const params = new URLSearchParams(location.search);
    const from = params.get('from') || params.get('orig');
    const to = params.get('to') || params.get('dest');
    const station = params.get('station') || params.get('st');

    const BASE = 'https://www.ahmedabadmetro.site';

    if (from && to) {
      const fromSlug = stationToSlug(from);
      const toSlug = stationToSlug(to);
      canonical.href = `${BASE}/route/${fromSlug}-to-${toSlug}/`;
    } else if (station && !from && !to) {
      const stSlug = stationToSlug(station);
      canonical.href = `${BASE}/station/${stSlug}/`;
    } else if (location.pathname.startsWith('/route/')) {
      const slug = location.pathname.replace(/^\/route\//, '').replace(/\/$/, '');
      canonical.href = `${BASE}/route/${slug}/`;
    } else if (location.pathname.startsWith('/station/')) {
      const slug = location.pathname.replace(/^\/station\//, '').replace(/\/$/, '');
      canonical.href = `${BASE}/station/${slug}/`;
    } else if (location.pathname.startsWith('/line/')) {
      const slug = location.pathname.replace(/^\/line\//, '').replace(/\/$/, '');
      const canonicalSlug = slug === 'green-line' ? 'yellow-line' : slug;
      canonical.href = `${BASE}/line/${canonicalSlug}`;
    } else if (['/map', '/stations', '/routes', '/route', '/fare', '/fare-chart', '/timings', '/airport', '/parking', '/interchange'].includes(location.pathname)) {
      canonical.href = `${BASE}${location.pathname}`;
    } else {
      canonical.href = `${BASE}/`;
    }
  }, [location.pathname, location.search]);

  return null;
}

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
          <CanonicalHead />
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
