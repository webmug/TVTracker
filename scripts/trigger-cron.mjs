// Kleine trigger voor de Railway Cron-service. Roept het beveiligde cron-endpoint
// van de web-app aan. Vereist env: APP_URL (of NEXTAUTH_URL) en CRON_SECRET.
//
// Railway Cron start-commando:  node scripts/trigger-cron.mjs

const base = process.env.APP_URL || process.env.NEXTAUTH_URL;
const secret = process.env.CRON_SECRET;

if (!base || !secret) {
  console.error("APP_URL/NEXTAUTH_URL en CRON_SECRET zijn vereist.");
  process.exit(1);
}

const url = `${base.replace(/\/$/, "")}/api/cron/new-episodes`;

try {
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  console.log(`[trigger] ${res.status} ${text}`);
  process.exit(res.ok ? 0 : 1);
} catch (e) {
  console.error("[trigger] request faalde:", e.message);
  process.exit(1);
}
