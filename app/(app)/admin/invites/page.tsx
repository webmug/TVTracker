import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { sendInviteEmail } from "@/lib/email";

async function createInvite(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return;

  const existing = await prisma.invite.findUnique({ where: { email } });
  await prisma.invite.upsert({
    where: { email },
    create: {
      email,
      token: randomBytes(16).toString("hex"),
      invitedBy: admin.id,
    },
    update: {}, // bestaat al -> laat staan
  });

  // Alleen mailen als er nog geen account voor dit adres is (nieuwe of nog
  // niet geaccepteerde uitnodiging).
  if (!existing?.usedAt) {
    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
    if (process.env.RESEND_API_KEY) {
      try {
        await sendInviteEmail(email, appUrl, admin.email);
      } catch (err) {
        console.error("[invite] versturen van uitnodigingsmail mislukt:", err);
      }
    } else {
      console.log(`\n✉️ [dev] Uitnodiging voor ${email}: ${appUrl}/login\n`);
    }
  }

  revalidatePath("/admin/invites");
}

// Laatste login in het Nederlands, met een relatieve hint voor recente logins.
function lastLoginLabel(date: Date | null): string {
  if (!date) return "nog nooit ingelogd";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const rel =
    days <= 0 ? "vandaag" : days === 1 ? "gisteren" : days < 30 ? `${days} dagen geleden` : null;
  const absolute = date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return rel ? `${rel} · ${absolute}` : absolute;
}

async function deleteInvite(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) await prisma.invite.deleteMany({ where: { id } });
  revalidatePath("/admin/invites");
}

export default async function InvitesPage() {
  await requireAdmin();
  const invites = await prisma.invite.findMany({ orderBy: { createdAt: "desc" } });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { email: true, role: true, createdAt: true, lastLoginAt: true },
  });

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Uitnodigen</h1>
      <p className="mb-4 text-sm text-(--color-muted)">
        Voeg het e-mailadres toe van familie/vrienden. Zij ontvangen direct een
        uitnodigingsmail en kunnen daarna inloggen via de inloglink.
      </p>

      <form action={createInvite} className="mb-8 flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="naam@voorbeeld.nl"
          className="flex-1 rounded-lg border border-white/10 bg-(--color-panel) px-4 py-3 outline-none focus:border-(--color-accent)"
        />
        <button className="rounded-lg bg-(--color-accent) px-5 py-3 font-medium text-white">
          Uitnodigen
        </button>
      </form>

      <h2 className="mb-2 text-sm font-medium text-(--color-muted)">Uitnodigingen</h2>
      <ul className="mb-8 flex flex-col gap-2">
        {invites.length === 0 && (
          <li className="text-sm text-(--color-muted)">Nog geen uitnodigingen.</li>
        )}
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-(--color-panel) px-3 py-2 text-sm"
          >
            <span className="flex-1">{inv.email}</span>
            <span className={inv.usedAt ? "text-emerald-400" : "text-amber-300"}>
              {inv.usedAt ? "actief" : "uitgenodigd"}
            </span>
            <form action={deleteInvite}>
              <input type="hidden" name="id" value={inv.id} />
              <button className="text-(--color-muted) hover:text-red-300">
                verwijderen
              </button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-sm font-medium text-(--color-muted)">Gebruikers</h2>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li
            key={u.email}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-(--color-panel) px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate">{u.email}</span>
              <span
                className={
                  "text-xs " + (u.lastLoginAt ? "text-(--color-muted)" : "text-amber-300")
                }
              >
                {lastLoginLabel(u.lastLoginAt)}
              </span>
            </div>
            <span className="shrink-0 text-(--color-muted)">{u.role}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
