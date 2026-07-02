import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

const FROM = process.env.EMAIL_FROM || "TV Tracker <onboarding@resend.dev>";

function wrap(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b1020;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e6e9f2">
    <div style="max-width:520px;margin:0 auto;background:#151a30;border-radius:12px;padding:28px">
      <h1 style="font-size:18px;margin:0 0 16px">${title}</h1>
      ${body}
      <p style="color:#8b93ad;font-size:12px;margin-top:28px">TV Tracker — jouw eigen serie-tracker</p>
    </div>
  </body></html>`;
}

export async function sendLoginLink(to: string, url: string): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY ontbreekt.");
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Je inloglink voor TV Tracker",
    html: wrap(
      "Inloggen bij TV Tracker",
      `<p>Klik op de knop om in te loggen. De link is 24 uur geldig.</p>
       <p style="margin:24px 0">
         <a href="${url}" style="background:#5b8cff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Inloggen</a>
       </p>
       <p style="color:#8b93ad;font-size:12px">Werkt de knop niet? Plak deze link:<br>${url}</p>`
    ),
  });
}

export interface NewEpisodeMail {
  showName: string;
  episodes: { label: string; name: string | null; airDate: Date | null }[];
}

export async function sendNewEpisodesEmail(
  to: string,
  shows: NewEpisodeMail[],
  appUrl: string
): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY ontbreekt.");
  const rows = shows
    .map(
      (s) => `<div style="margin:0 0 16px">
        <strong>${s.showName}</strong>
        <ul style="margin:6px 0 0;padding-left:18px;color:#c6cbe0">
          ${s.episodes
            .map(
              (e) =>
                `<li>${e.label}${e.name ? ` — ${e.name}` : ""}${
                  e.airDate
                    ? ` <span style="color:#8b93ad">(${e.airDate.toLocaleDateString("nl-NL")})</span>`
                    : ""
                }</li>`
            )
            .join("")}
        </ul>
      </div>`
    )
    .join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Nieuwe afleveringen van jouw series",
    html: wrap(
      "Er zijn nieuwe afleveringen! 📺",
      `${rows}
       <p style="margin:24px 0 0">
         <a href="${appUrl}" style="background:#5b8cff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">Bekijk in TV Tracker</a>
       </p>`
    ),
  });
}
