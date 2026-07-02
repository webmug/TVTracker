import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseTvTimeZip, runImport } from "@/lib/import/tvtime";

export const maxDuration = 300; // import kan even duren (veel TMDB-calls)

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const mode = String(form.get("mode") || "dry");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseTvTimeZip(buffer);
  } catch {
    return NextResponse.json(
      { error: "Kon de ZIP niet lezen. Is dit de TV Time-export (.zip)?" },
      { status: 400 }
    );
  }

  const report = await runImport(session.user.id, parsed.rows, {
    dryRun: mode !== "commit",
  });

  return NextResponse.json({
    mode,
    files: parsed.files,
    warnings: parsed.warnings,
    report,
  });
}
