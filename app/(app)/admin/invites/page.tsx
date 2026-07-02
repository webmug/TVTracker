import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

async function createInvite(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return;
  await prisma.invite.upsert({
    where: { email },
    create: {
      email,
      token: randomBytes(16).toString("hex"),
      invitedBy: admin.id,
    },
    update: {}, // bestaat al -> laat staan
  });
  revalidatePath("/admin/invites");
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
    select: { email: true, role: true, createdAt: true },
  });

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Uitnodigen</h1>
      <p className="mb-4 text-sm text-[--color-muted]">
        Voeg het e-mailadres toe van familie/vrienden. Zij kunnen daarna inloggen
        via de inloglink.
      </p>

      <form action={createInvite} className="mb-8 flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="naam@voorbeeld.nl"
          className="flex-1 rounded-lg border border-white/10 bg-[--color-panel] px-4 py-3 outline-none focus:border-[--color-accent]"
        />
        <button className="rounded-lg bg-[--color-accent] px-5 py-3 font-medium text-white">
          Uitnodigen
        </button>
      </form>

      <h2 className="mb-2 text-sm font-medium text-[--color-muted]">Uitnodigingen</h2>
      <ul className="mb-8 flex flex-col gap-2">
        {invites.length === 0 && (
          <li className="text-sm text-[--color-muted]">Nog geen uitnodigingen.</li>
        )}
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-[--color-panel] px-3 py-2 text-sm"
          >
            <span className="flex-1">{inv.email}</span>
            <span className={inv.usedAt ? "text-emerald-400" : "text-amber-300"}>
              {inv.usedAt ? "actief" : "uitgenodigd"}
            </span>
            <form action={deleteInvite}>
              <input type="hidden" name="id" value={inv.id} />
              <button className="text-[--color-muted] hover:text-red-300">
                verwijderen
              </button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-sm font-medium text-[--color-muted]">Gebruikers</h2>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li
            key={u.email}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-[--color-panel] px-3 py-2 text-sm"
          >
            <span className="flex-1">{u.email}</span>
            <span className="text-[--color-muted]">{u.role}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
