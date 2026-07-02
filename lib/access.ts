import { prisma } from "@/lib/prisma";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.toLowerCase());
}

// Mag dit e-mailadres inloggen? Toegestaan als: admin-adres, bestaande gebruiker,
// of een ongebruikte uitnodiging bestaat.
export async function isAllowedToSignIn(emailRaw: string): Promise<boolean> {
  const email = emailRaw.toLowerCase();
  if (isAdminEmail(email)) return true;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) return true;

  const invite = await prisma.invite.findUnique({ where: { email } });
  return Boolean(invite && !invite.usedAt);
}
