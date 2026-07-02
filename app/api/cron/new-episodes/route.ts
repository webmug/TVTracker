import { NextResponse } from "next/server";
import { checkNewEpisodes } from "@/lib/notify";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Beveiligd cron-endpoint. Aanroepen met header: Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET niet ingesteld." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkNewEpisodes();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
