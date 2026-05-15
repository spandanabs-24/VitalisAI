import { NextResponse } from "next/server";

/** Proxy public health signals for predictive awareness (demo layer). */
export async function GET() {
  try {
    const res = await fetch("https://disease.sh/v3/covid-19/countries/india?strict=true", {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const j = (await res.json()) as Record<string, unknown>;
    return NextResponse.json({
      source: "disease.sh (public COVID-19 country stats — demo signal only)",
      country: j.country,
      updated: j.updated,
      cases: j.cases,
      todayCases: j.todayCases,
      active: j.active,
      recovered: j.recovered,
      deaths: j.deaths,
      casesPerOneMillion: j.casesPerOneMillion,
      disclaimer:
        "Not clinical surveillance. Use official public-health dashboards for decisions. Shown to illustrate API-driven outbreak awareness.",
    });
  } catch {
    return NextResponse.json(
      {
        source: "fallback",
        error: "Outbreak feed unavailable",
        disclaimer: "Connect to the internet to load live India stats; triage still works offline.",
      },
      { status: 503 }
    );
  }
}
