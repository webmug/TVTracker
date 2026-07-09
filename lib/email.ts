import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

const FROM = process.env.EMAIL_FROM || "TV Tracker <onboarding@resend.dev>";

// Kleine, tabel-gebaseerde e-mail-layout (Outlook/Gmail-vriendelijk) met een
// vaste kop, kaart en footer. Gedeeld door alle mails hieronder.
function layout(opts: { preheader?: string; title: string; body: string }): string {
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <title>TV Tracker</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${
      opts.preheader
        ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${opts.preheader}</div>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding-bottom:24px;text-align:center;">
                <span style="font-size:15px;font-weight:700;letter-spacing:0.02em;color:#eef0fa;">📺&nbsp;TV&nbsp;Tracker</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#131829;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
                <h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#f5f6fb;font-weight:600;">${opts.title}</h1>
                <div style="font-size:14px;line-height:1.65;color:#c6cbe0;">${opts.body}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#5f6683;">TV Tracker — jouw eigen serie-tracker</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;">
    <tr>
      <td style="border-radius:10px;background-color:#5b8cff;">
        <a href="${href}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function fallbackLink(url: string): string {
  return `<p style="margin:20px 0 0;font-size:12px;color:#5f6683;">Werkt de knop niet? Plak deze link in je browser:<br /><a href="${url}" style="color:#8b93ad;word-break:break-all;">${url}</a></p>`;
}

export async function sendLoginLink(to: string, url: string): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY ontbreekt.");
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Je inloglink voor TV Tracker",
    html: layout({
      preheader: "Klik op de knop om in te loggen bij TV Tracker.",
      title: "Inloggen bij TV Tracker",
      body: `<p style="margin:0;">Klik op de knop hieronder om in te loggen. De link is 24 uur geldig en eenmalig te gebruiken.</p>
       ${button("Inloggen", url)}
       ${fallbackLink(url)}`,
    }),
  });
}

export async function sendInviteEmail(
  to: string,
  appUrl: string,
  invitedByEmail?: string
): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY ontbreekt.");
  const loginUrl = `${appUrl}/login?email=${encodeURIComponent(to)}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Je bent uitgenodigd voor TV Tracker",
    html: layout({
      preheader: "Je bent uitgenodigd om je series bij te houden op TV Tracker.",
      title: "Je bent uitgenodigd! 🎉",
      body: `<p style="margin:0;">${
        invitedByEmail ? `${invitedByEmail} heeft je` : "Je bent"
      } uitgenodigd voor TV Tracker — een plek om bij te houden welke series en films je volgt, welke afleveringen je al hebt gezien en wat er nieuw uitkomt.</p>
       <p style="margin:16px 0 0;">Klik op de knop om je aan te melden met dit e-mailadres (<strong>${to}</strong>). Je krijgt daarna een inloglink toegestuurd, dus je hebt geen wachtwoord nodig.</p>
       ${button("Aanmelden bij TV Tracker", loginUrl)}
       ${fallbackLink(loginUrl)}`,
    }),
  });
}

export interface NewEpisodeMail {
  showName: string;
  episodes: { label: string; name: string | null; airDate: Date | null }[];
}

// Bouwt de per-serie afleveringenlijst; gedeeld door de dagelijkse en wekelijkse mail.
function episodeRows(shows: NewEpisodeMail[]): string {
  return shows
    .map(
      (s, i) => `<div style="margin:0 0 18px;${
        i > 0 ? "padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);" : ""
      }">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#f5f6fb;">${s.showName}</p>
        <ul style="margin:0;padding-left:18px;">
          ${s.episodes
            .map(
              (e) =>
                `<li style="margin:0 0 4px;color:#c6cbe0;">${e.label}${e.name ? ` — ${e.name}` : ""}${
                  e.airDate
                    ? ` <span style="color:#8b93ad;">(${e.airDate.toLocaleDateString("nl-NL")})</span>`
                    : ""
                }</li>`
            )
            .join("")}
        </ul>
      </div>`
    )
    .join("");
}

export async function sendNewEpisodesEmail(
  to: string,
  shows: NewEpisodeMail[],
  appUrl: string
): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY ontbreekt.");
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Nieuwe afleveringen van jouw series",
    html: layout({
      preheader: "Er zijn nieuwe afleveringen beschikbaar van series die je volgt.",
      title: "Er zijn nieuwe afleveringen 📺",
      body: `${episodeRows(shows)}
       ${button("Bekijk in TV Tracker", appUrl)}`,
    }),
  });
}

// Wekelijkse vrijdag-samenvatting van alles wat deze week nieuw is uitgezonden.
export async function sendWeeklyDigestEmail(
  to: string,
  shows: NewEpisodeMail[],
  appUrl: string
): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY ontbreekt.");
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Je wekelijkse serie-update 📺",
    html: layout({
      preheader: "Dit is er deze week bijgekomen bij de series die je volgt.",
      title: "Deze week nieuw uitgezonden",
      body: `<p style="margin:0 0 18px;color:#c6cbe0;">Dit is er de afgelopen week bijgekomen bij de series die je volgt.</p>
       ${episodeRows(shows)}
       ${button("Bekijk in TV Tracker", appUrl)}`,
    }),
  });
}
