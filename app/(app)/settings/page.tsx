import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

async function saveSettings(formData: FormData) {
  "use server";
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      dailyEmails: formData.get("dailyEmails") === "on",
      weeklyDigest: formData.get("weeklyDigest") === "on",
    },
  });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const user = await requireUser();
  const prefs = await prisma.user.findUnique({
    where: { id: user.id },
    select: { dailyEmails: true, weeklyDigest: true },
  });

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Instellingen</h1>
      <p className="mb-6 text-sm text-[--color-muted]">
        Bepaal welke e-mails je van TV Tracker ontvangt op {user.email}.
      </p>

      <form action={saveSettings} className="flex max-w-lg flex-col gap-4">
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[--color-panel] px-4 py-3">
          <input
            type="checkbox"
            name="weeklyDigest"
            defaultChecked={prefs?.weeklyDigest ?? true}
            className="mt-1 h-4 w-4 accent-[--color-accent]"
          />
          <span>
            <span className="block font-medium">Wekelijkse samenvatting</span>
            <span className="block text-sm text-[--color-muted]">
              Elke vrijdag een overzicht van de series die je volgt en die deze week
              nieuwe afleveringen kregen.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-[--color-panel] px-4 py-3">
          <input
            type="checkbox"
            name="dailyEmails"
            defaultChecked={prefs?.dailyEmails ?? true}
            className="mt-1 h-4 w-4 accent-[--color-accent]"
          />
          <span>
            <span className="block font-medium">Dagelijkse melding bij nieuwe afleveringen</span>
            <span className="block text-sm text-[--color-muted]">
              Een mail zodra er een nieuwe aflevering is uitgezonden van een serie die je volgt.
            </span>
          </span>
        </label>

        <button className="self-start rounded-lg bg-[--color-accent] px-5 py-3 font-medium text-white">
          Opslaan
        </button>
      </form>
    </main>
  );
}
