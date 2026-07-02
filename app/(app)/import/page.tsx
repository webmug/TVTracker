"use client";

import { useState } from "react";

interface ReportSeries {
  name: string | null;
  matchedTmdbId: number | null;
  matchedName: string | null;
  episodeCount: number;
  confidence: "id" | "name" | "none";
}
interface ApiResult {
  mode: string;
  files: { name: string; rows: number; mapping: Record<string, string> }[];
  warnings: string[];
  report: {
    series: ReportSeries[];
    totals: { series: number; matched: number; episodes: number; unmatchedSeries: number };
  };
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState<false | "dry" | "commit">(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function upload(mode: "dry" | "commit") {
    if (!file) return;
    setLoading(mode);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", mode);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Er ging iets mis.");
      } else {
        setResult(data);
        if (mode === "commit") setDone(true);
      }
    } catch {
      setError("Upload mislukt.");
    } finally {
      setLoading(false);
    }
  }

  const t = result?.report.totals;

  return (
    <main>
      <h1 className="mb-2 text-xl font-semibold">Importeer je TV Time-historie</h1>
      <p className="mb-4 text-sm text-[--color-muted]">
        Vraag je export aan op{" "}
        <a
          href="https://gdpr.tvtime.com/gdpr/self-service"
          target="_blank"
          rel="noreferrer"
          className="text-[--color-accent] underline"
        >
          gdpr.tvtime.com
        </a>{" "}
        (vóór 15 juli 2026!) en upload hier de ontvangen <code>.zip</code>. We tonen
        eerst een voorbeeld; pas daarna importeren we echt.
      </p>

      <div className="rounded-xl border border-white/10 bg-[--color-panel] p-4">
        <input
          type="file"
          accept=".zip"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
            setDone(false);
          }}
          className="block w-full text-sm text-[--color-muted] file:mr-3 file:rounded-lg file:border-0 file:bg-[--color-accent] file:px-4 file:py-2 file:text-white"
        />
        <div className="mt-4 flex gap-2">
          <button
            disabled={!file || loading !== false}
            onClick={() => upload("dry")}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40"
          >
            {loading === "dry" ? "Analyseren…" : "1. Voorbeeld tonen"}
          </button>
          <button
            disabled={!file || !result || loading !== false || done}
            onClick={() => upload("commit")}
            className="rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading === "commit" ? "Importeren…" : "2. Import bevestigen"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {done && (
        <p className="mt-4 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300">
          Import voltooid! Bekijk je{" "}
          <a href="/dashboard" className="underline">
            dashboard
          </a>
          .
        </p>
      )}

      {result && t && (
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Series" value={t.series} />
            <Stat label="Herkend" value={t.matched} />
            <Stat label="Afleveringen" value={t.episodes} />
          </div>

          {result.warnings.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-amber-300">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}

          {t.unmatchedSeries > 0 && (
            <p className="mt-4 text-sm text-amber-300">
              {t.unmatchedSeries} serie(s) niet automatisch herkend — zie lijst.
            </p>
          )}

          <h2 className="mb-2 mt-6 text-sm font-medium text-[--color-muted]">
            Herkende series
          </h2>
          <ul className="flex flex-col gap-1.5">
            {result.report.series.map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-[--color-panel] px-3 py-2 text-sm"
              >
                <span className="flex-1">
                  {s.name ?? "(onbekende titel)"}
                  {s.matchedName && s.matchedName !== s.name && (
                    <span className="text-[--color-muted]"> → {s.matchedName}</span>
                  )}
                </span>
                <span className="text-[--color-muted]">{s.episodeCount} afl.</span>
                <span
                  className={
                    s.confidence === "id"
                      ? "text-emerald-400"
                      : s.confidence === "name"
                        ? "text-sky-400"
                        : "text-red-300"
                  }
                >
                  {s.confidence === "id"
                    ? "match (id)"
                    : s.confidence === "name"
                      ? "match (titel)"
                      : "geen match"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[--color-panel] p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-[--color-muted]">{label}</div>
    </div>
  );
}
