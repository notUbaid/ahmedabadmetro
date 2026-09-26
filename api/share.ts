import type { VercelRequest, VercelResponse } from '@vercel/node';

function formatStationName(id: string): string {
  if (!id) return '';
  return id
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatMinutes(mins: string): string {
  const num = parseInt(mins, 10);
  if (isNaN(num)) return '';
  const h = Math.floor(num / 60) % 24;
  const m = num % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = req.query;
  const origRaw = (query.orig || query.from || '') as string;
  const destRaw = (query.dest || query.to || '') as string;
  const stationRaw = (query.station || query.st || '') as string;
  const depMinsRaw = (query.depMins || '') as string;
  const joinTrainRaw = (query.joinTrain || '') as string;

  const originStation = origRaw ? formatStationName(origRaw) : '';
  const destStation = destRaw ? formatStationName(destRaw) : '';
  const singleStation = stationRaw ? formatStationName(stationRaw) : '';
  const depTime = depMinsRaw ? formatMinutes(depMinsRaw) : '';

  let title = 'AhmMetro — Live Ahmedabad Metro Route & Tracking';
  let description = 'Real-time metro timetable, route planner, active train animation, and fares for all 53 stations of Ahmedabad Metro.';
  let jsonLd: Record<string, unknown> | null = null;

  if (originStation && destStation) {
    title = `🚆 ${originStation} ➔ ${destStation} | Ahmedabad Metro Route, Timings & Fare`;
    description = depTime
      ? `Departing at ${depTime}. View real-time route, interchanges, arrival times, fare, and track metro live.`
      : `View real-time route, interchanges, official GMRC fares, first/last trains, and track metro live between ${originStation} and ${destStation}.`;
    
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "TrainTrip",
      "departureStation": {
        "@type": "TransitStop",
        "name": `${originStation} Metro Station`
      },
      "arrivalStation": {
        "@type": "TransitStop",
        "name": `${destStation} Metro Station`
      },
      "provider": {
        "@type": "Organization",
        "name": "Gujarat Metro Rail Corporation (GMRC)",
        "url": "https://www.ahmedabadmetro.site"
      }
    };
  } else if (singleStation) {
    title = `🚆 ${singleStation} Metro Station — Timings, Lines & Next Metro | Ahmedabad Metro`;
    description = `First train, last train, interchange details, fare charts and real-time departure countdown for ${singleStation} Station on Ahmedabad Metro.`;
    
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "TransitStop",
      "name": `${singleStation} Metro Station`,
      "description": `Ahmedabad and Gandhinagar Metro station operated by Gujarat Metro Rail Corporation (GMRC).`,
      "containedInPlace": {
        "@type": "City",
        "name": "Ahmedabad",
        "addressRegion": "Gujarat",
        "addressCountry": "IN"
      }
    };
  } else if (joinTrainRaw) {
    title = `🚆 Track Metro Live | Ahmedabad Metro`;
    description = `Track live metro progress and coordinate your journey in real time on AhmMetro.`;
  }

  const host = req.headers.host || 'www.ahmedabadmetro.site';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const appUrl = new URL(`${proto}://${host}/`);

  if (origRaw) appUrl.searchParams.set('from', origRaw);
  if (destRaw) appUrl.searchParams.set('to', destRaw);
  if (stationRaw && !origRaw && !destRaw) appUrl.searchParams.set('station', stationRaw);
  if (depMinsRaw) appUrl.searchParams.set('depMins', depMinsRaw);
  if (joinTrainRaw) appUrl.searchParams.set('joinTrain', joinTrainRaw);

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /facebookexternalhit|twitterbot|whatsapp|telegrambot|slackbot|linkedinbot|discordbot|applebot|applebot-extended|bingbot|googlebot|gptbot|chatgpt-user|perplexitybot|claudebot|anthropic-ai|google-extended|bytespider|ccbot|diffbot|cohere-ai|youbot/i.test(userAgent);

  // If a human visitor opens the share API link, redirect them directly into the app
  if (!isBot && !req.query.preview) {
    res.writeHead(302, { Location: appUrl.toString() });
    return res.end();
  }

  // Otherwise return full HTML with OpenGraph tags and JSON-LD for rich preview cards and AI engine parsing
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  
  <!-- OpenGraph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(appUrl.toString())}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="https://www.ahmedabadmetro.site/og-image.png" />
  <meta property="og:site_name" content="AhmMetro" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapeHtml(appUrl.toString())}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="https://www.ahmedabadmetro.site/og-image.png" />

  <!-- AI & Structured Data -->
  <link rel="help" type="text/plain" href="https://www.ahmedabadmetro.site/llms.txt" />
  <link rel="help" type="text/plain" href="https://www.ahmedabadmetro.site/llms-full.txt" />
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}

  <!-- Instant fallback redirect for browsers that render HTML -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl.toString())}" />
  <script>
    window.location.replace(${JSON.stringify(appUrl.toString())});
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
  <div style="text-align: center; padding: 24px; max-width: 600px;">
    <h2>${escapeHtml(title)}</h2>
    <p style="color: #94a3b8; line-height: 1.6;">${escapeHtml(description)}</p>
    <p style="margin-top: 20px;"><a href="${escapeHtml(appUrl.toString())}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open in AhmMetro App</a></p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
