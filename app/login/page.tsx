import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { error, email } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    if (!email) return;
    try {
      await signIn("resend", { email, redirectTo: "/dashboard" });
    } catch (err) {
      // Geweigerd (niet uitgenodigd) e.d. -> nette melding i.p.v. 500.
      if (err instanceof AuthError) {
        redirect(`/login?error=${err.type}`);
      }
      // Succes gooit een NEXT_REDIRECT naar /login/check; die moeten we doorlaten.
      throw err;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">📺 TV Tracker</h1>
      <p className="mt-2 text-(--color-muted)">
        Log in met je e-mailadres. Je krijgt een inloglink toegestuurd.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">
          Inloggen mislukt. Ben je uitgenodigd? Vraag de beheerder om een uitnodiging.
        </p>
      )}

      <form action={login} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          defaultValue={email || ""}
          placeholder="jij@voorbeeld.nl"
          className="rounded-lg border border-white/10 bg-(--color-panel) px-4 py-3 outline-none focus:border-(--color-accent)"
        />
        <button
          type="submit"
          className="rounded-lg bg-(--color-accent) px-4 py-3 font-medium text-white hover:opacity-90"
        >
          Stuur inloglink
        </button>
      </form>

      <p className="mt-6 text-xs text-(--color-muted)">
        Alleen genodigden kunnen inloggen. Toegang is invite-only.
      </p>
    </main>
  );
}
