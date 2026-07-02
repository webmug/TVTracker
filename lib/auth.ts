import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { sendLoginLink } from "@/lib/email";
import { isAdminEmail, isAllowedToSignIn } from "@/lib/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check",
    error: "/login",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "TV Tracker <onboarding@resend.dev>",
      // Gate + eigen template.
      async sendVerificationRequest({ identifier, url }) {
        const allowed = await isAllowedToSignIn(identifier);
        if (!allowed) {
          // Voorkom account-enumeratie: geen mail, maar ook geen harde fout naar de UI.
          console.warn(`[auth] geweigerd (geen uitnodiging): ${identifier}`);
          return;
        }

        const hasResend = Boolean(process.env.RESEND_API_KEY);
        // Dev-gemak: zonder Resend-key (of buiten productie) printen we de inloglink
        // in de terminal, zodat je lokaal kunt inloggen zonder e-mailconfig.
        if (!hasResend || process.env.NODE_ENV !== "production") {
          console.log(
            `\n🔑 [dev] Inloglink voor ${identifier}:\n${url}\n(plak deze in je browser om in te loggen)\n`
          );
        }
        if (hasResend) {
          await sendLoginLink(identifier, url);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      return isAllowedToSignIn(email);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // role uit adapter-user doorgeven
        (session.user as { role?: string }).role = (user as { role?: string }).role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const email = user.email.toLowerCase();
      // Admin-rol toekennen indien op de admin-lijst.
      if (isAdminEmail(email)) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
      // Uitnodiging als gebruikt markeren.
      await prisma.invite.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      });
    },
  },
});
