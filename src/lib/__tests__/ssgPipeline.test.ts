import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { stations } from '../../data/metroData';
import { stationToSlug, routeToSlug, METRO_LINES } from '../seoRoutes';

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

describe('Pillar 1 SSG & Deep Route Indexing Pipeline Verification', () => {
  // Gate 1: Route & Slug Resolution Engine
  describe('Gate 1: Slug Normalization & Bidirectional Mapping', () => {
    it('should map every station to a clean hyphenated slug without special chars', () => {
      for (const [id, st] of Object.entries(stations)) {
        const slug = stationToSlug(id);
        expect(slug).toBeDefined();
        expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    });
  });

  // Gate 2: Static Page Generator for 53 Stations
  describe('Gate 2: 53 Station Landing Pages', () => {
    it('should have pre-rendered static HTML files for all 53 stations in dist/ and public/', () => {
      let verifiedCount = 0;
      const hasDist = fs.existsSync(DIST_DIR);

      for (const [id, st] of Object.entries(stations)) {
        const slug = stationToSlug(id);
        const distFile = path.join(DIST_DIR, 'station', slug, 'index.html');
        const publicFile = path.join(PUBLIC_DIR, 'station', slug, 'index.html');

        expect(fs.existsSync(publicFile), `public file missing for station: ${slug}`).toBe(true);
        if (hasDist) {
          expect(fs.existsSync(distFile), `dist file missing for station: ${slug}`).toBe(true);
        }

        const targetFile = hasDist && fs.existsSync(distFile) ? distFile : publicFile;
        const html = fs.readFileSync(targetFile, 'utf8');
        expect(html.length).toBeGreaterThan(2000);
        expect(html).toContain(`<title>${st.name} Metro Station`);
        expect(html).toContain(`https://www.ahmedabadmetro.site/station/${slug}`);
        expect(html).toContain('TransitStop');
        expect(html).toContain('FAQPage');
        expect(html).toContain('BreadcrumbList');
        expect(html).not.toContain('// TODO');
        expect(html).not.toContain('/* rest of code');

        verifiedCount++;
      }
      expect(verifiedCount).toBe(53);
    });
  });

  // Gate 3: Static Page Generator for Commuter Routes
  describe('Gate 3: Commuter Route Landing Pages (High-Intent SEO)', () => {
    it('should have pre-rendered static HTML files for 70+ commuter routes in dist/ or public/', () => {
      const hasDistRoute = fs.existsSync(path.join(DIST_DIR, 'route'));
      const routeDir = hasDistRoute ? path.join(DIST_DIR, 'route') : path.join(PUBLIC_DIR, 'route');
      expect(fs.existsSync(routeDir)).toBe(true);

      const generatedRoutes = fs.readdirSync(routeDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      expect(generatedRoutes.length).toBeGreaterThanOrEqual(70);

      // Verify sample high-volume commuter routes
      const sampleRoutes = [
        'thaltej-to-vastral-gam',
        'kalupur-to-motera-stadium',
        'thaltej-to-kalupur',
        'kalupur-to-gift-city',
        'gnlu-to-gift-city',
        'old-high-court-to-motera-stadium',
        'apmc-to-motera-stadium',
      ];

      for (const routeSlug of sampleRoutes) {
        expect(generatedRoutes).toContain(routeSlug);
        const routeFile = path.join(routeDir, routeSlug, 'index.html');
        expect(fs.existsSync(routeFile)).toBe(true);

        const html = fs.readFileSync(routeFile, 'utf8');
        expect(html.length).toBeGreaterThan(2000);
        expect(html).toContain('TrainTrip');
        expect(html).toContain('FAQPage');
        expect(html).toContain(`https://www.ahmedabadmetro.site/route/${routeSlug}`);
        expect(html).toContain('Paper Token Fare');
        expect(html).toContain('Smart Card Fare');

        // Verify high-intent user title format: "Ahmedabad Metro: ... to ... Route, Fare & Stations"
        expect(html).toMatch(/<title>Ahmedabad Metro: .* to .* Route, Fare & Stations \| AhmMetro<\/title>/);

        // Verify stop-by-stop station timeline is present
        expect(html).toContain('timeline-dot');
        expect(html).toContain('timeline-content');
      }
    });
  });

  // Gate 4: Metro Lines and Guide Pages
  describe('Gate 4: Metro Lines & High-Intent Search Guides', () => {
    it('should have pre-rendered static HTML for all 4 metro lines', () => {
      const hasDist = fs.existsSync(DIST_DIR);
      const lineKeys = ['blue-line', 'red-line', 'green-line', 'purple-line'];

      for (const lineSlug of lineKeys) {
        const lineDistFile = path.join(DIST_DIR, 'line', lineSlug, 'index.html');
        const linePublicFile = path.join(PUBLIC_DIR, 'line', lineSlug, 'index.html');

        expect(fs.existsSync(linePublicFile), `public file missing for line: ${lineSlug}`).toBe(true);
        if (hasDist) {
          expect(fs.existsSync(lineDistFile), `dist file missing for line: ${lineSlug}`).toBe(true);
        }

        const targetFile = hasDist && fs.existsSync(lineDistFile) ? lineDistFile : linePublicFile;
        const html = fs.readFileSync(targetFile, 'utf8');
        expect(html.length).toBeGreaterThan(2000);
        expect(html).toContain('TransitLine');
        expect(html).toContain(`https://www.ahmedabadmetro.site/line/${lineSlug}`);
      }
    });

    it('should have pre-rendered static HTML for high-intent queries: map, stations, routes, airport, parking, interchange, fare, timings', () => {
      const hasDist = fs.existsSync(DIST_DIR);
      const guidePages = [
        { path: 'map', titleKeyword: 'Ahmedabad Metro Map', canonical: '/map' },
        { path: 'stations', titleKeyword: 'Ahmedabad Metro Stations', canonical: '/stations' },
        { path: 'routes', titleKeyword: 'Ahmedabad Metro Route Planner', canonical: '/routes' },
        { path: 'airport', titleKeyword: 'Ahmedabad Metro to Airport', canonical: '/airport' },
        { path: 'parking', titleKeyword: 'Ahmedabad Metro Parking', canonical: '/parking' },
        { path: 'interchange', titleKeyword: 'Ahmedabad Metro Interchange', canonical: '/interchange' },
        { path: 'fare', titleKeyword: 'Ahmedabad Metro Fare', canonical: '/fare' },
        { path: 'fare-chart', titleKeyword: 'Ahmedabad Metro Fare', canonical: '/fare-chart' },
        { path: 'timings', titleKeyword: 'Ahmedabad Metro Timings', canonical: '/timings' },
      ];

      for (const page of guidePages) {
        const distFile = path.join(DIST_DIR, page.path, 'index.html');
        const publicFile = path.join(PUBLIC_DIR, page.path, 'index.html');

        expect(fs.existsSync(publicFile), `public file missing for: ${page.path}`).toBe(true);
        if (hasDist) {
          expect(fs.existsSync(distFile), `dist file missing for: ${page.path}`).toBe(true);
        }

        const targetFile = hasDist && fs.existsSync(distFile) ? distFile : publicFile;
        const html = fs.readFileSync(targetFile, 'utf8');
        expect(html.length).toBeGreaterThan(2000);
        expect(html).toContain(page.titleKeyword);
        expect(html).toContain(`https://www.ahmedabadmetro.site${page.canonical}`);
      }
    });
  });

  // Gate 6: XML Sitemap & Robots
  describe('Gate 6: XML Sitemap Clean Canonical URL Audit', () => {
    it('should contain clean canonical URLs for stations, routes, lines, and all high-intent guides', () => {
      const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);

      const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/station/kalupur</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/station/motera-stadium</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/route/kalupur-to-motera-stadium</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/line/blue-line</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/map</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/stations</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/routes</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/fare</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/fare-chart</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/timings</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/airport</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/parking</loc>');
      expect(sitemapXml).toContain('<loc>https://www.ahmedabadmetro.site/interchange</loc>');

      // Verify no legacy query parameter canonicals in sitemap
      expect(sitemapXml).not.toContain('<loc>https://www.ahmedabadmetro.site/?station=');
      expect(sitemapXml).not.toContain('<loc>https://www.ahmedabadmetro.site/?from=');
    });

    it('should allow crawling of all pages in robots.txt', () => {
      const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);

      const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
      expect(robotsTxt).toContain('User-agent: Googlebot');
      expect(robotsTxt).toContain('User-agent: GPTBot');
      expect(robotsTxt).toContain('User-agent: PerplexityBot');
      expect(robotsTxt).toContain('Sitemap: https://www.ahmedabadmetro.site/sitemap.xml');
    });
  });
});
