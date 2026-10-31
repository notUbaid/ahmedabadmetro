import type { VercelRequest, VercelResponse } from '@vercel/node';
import geocodeHandler from './geocode';

interface GeoJsonFeature {
  properties?: {
    id?: string | number;
    label?: string;
    name?: string;
    type?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

interface GeoJsonCollection {
  features?: GeoJsonFeature[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const geo = body as GeoJsonCollection | null | undefined;
    if (geo && geo.features && Array.isArray(geo.features)) {
      const items = geo.features.map((f: GeoJsonFeature, idx: number) => ({
        place_id: f.properties?.id ?? idx,
        osm_id: f.properties?.id ?? idx,
        osm_type: 'node',
        lat: String(f.geometry?.coordinates?.[1] ?? 0),
        lon: String(f.geometry?.coordinates?.[0] ?? 0),
        display_name: f.properties?.label || f.properties?.name || 'Ahmedabad',
        name: f.properties?.name || f.properties?.label || 'Ahmedabad',
        type: f.properties?.type || 'station',
      }));
      return originalJson(items);
    }
    return originalJson(body);
  };

  return geocodeHandler(req, res);
}
