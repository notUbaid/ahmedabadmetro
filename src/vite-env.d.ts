/// <reference types="vite/client" />

declare module '*.geojson' {
  const value: GeoJSON.FeatureCollection;
  export default value;
}

declare module '@/data/metroRoutes.geojson' {
  const value: GeoJSON.FeatureCollection;
  export default value;
}

declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}