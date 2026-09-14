import type { VercelRequest, VercelResponse } from '@vercel/node';

function formatStationName(id: string): string {
  if (!id) return '';
  return id
    .split('-')
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
  const { orig, dest, depMins, joinTrain } = req.query;

  const originStation = typeof orig === 'string' ? formatStationName(orig) : '';
  const destStation = typeof dest === 'string' ? formatStationName(dest) : '';
  const depTime = typeof depMins === 'string' ? formatMinutes(depMins) : '';

  let title = 'AhmMetro — Live Ahmedabad Metro Route & Tracking';
  let description = 'Real-time metro timetable, route planner, active train animation, and fares for Ahmedabad Metro.';

  if (originStation && destStation) {
    title = `🚆 ${originStation} ➔ ${destStation} | Ahmedabad Metro`;
    description = depTime
      ? `Departing at ${depTime}. View real-time route, interchanges, arrival times, and track metro live.`
      : `View real-time route, interchanges, fares, and track metro live between ${originStation} and ${destStation}.`;
  } else if (typeof joinTrain === 'string') {
    title = `🚆 Track Metro Live | Ahmedabad Metro`;
    description = `Track live metro progress and coordinate your journey in real time on AhmMetro.`;
  }

  const host = req.headers.host || 'ahmedabadmetro.site';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const appUrl = new URL(`${proto}://${host}/`);
  if (orig && typeof orig === 'string') appUrl.searchParams.set('orig', orig);
  if (dest && typeof dest === 'string') appUrl.searchParams.set('dest', dest);
  if (depMins && typeof depMins === 'string') appUrl.searchParams.set('depMins', depMins);
  if (joinTrain && typeof joinTrain === 'string') appUrl.searchParams.set('joinTrain', joinTrain);

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /facebookexternalhit|twitterbot|whatsapp|telegrambot|slackbot|linkedinbot|discordbot|applebot|bingbot|googlebot/i.test(userAgent);

  // If a human visitor opens the share API link, redirect them directly into the app
  if (!isBot && !req.query.preview) {
    res.writeHead(302, { Location: appUrl.toString() });
    return res.end();
  }

  // Otherwise return full HTML with OpenGraph tags for rich preview cards
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
  <meta property="og:image" content="https://ahmedabadmetro.site/og-preview.png" />
  <meta property="og:site_name" content="AhmMetro" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapeHtml(appUrl.toString())}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="https://ahmedabadmetro.site/og-preview.png" />

  <!-- Instant fallback redirect for browsers that render HTML -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl.toString())}" />
  <script>
    window.location.replace(${JSON.stringify(appUrl.toString())});
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
  <div style="text-align: center; padding: 24px;">
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(appUrl.toString())}" style="color: #38bdf8; text-decoration: none; font-weight: bold;">Click here to open AhmMetro</a></p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
