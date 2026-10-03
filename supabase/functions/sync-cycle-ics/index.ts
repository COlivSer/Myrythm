import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ICSPeriodEntry {
  startDate: string;
  summary: string;
}

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseICSDate(dateStr: string): string | null {
  dateStr = dateStr.trim();
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  if (/^\d{8}T\d{6}Z?$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return null;
}

function parseICSForPeriods(icsText: string, keywords: string[] = ["period", "menstrual", "cycle", "menstruation"]): ICSPeriodEntry[] {
  const entries: ICSPeriodEntry[] = [];
  const lines = icsText.split(/\r?\n/);
  let inEvent = false;
  let currentSummary = "";
  let currentStart: string | null = null;
  let matchedKeyword = false;
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      currentSummary = "";
      currentStart = null;
      matchedKeyword = false;
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent && matchedKeyword && currentStart) {
        entries.push({ startDate: currentStart, summary: currentSummary });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    if (line.startsWith("SUMMARY:")) {
      currentSummary = unescapeICS(line.slice("SUMMARY:".length));
      if (lowerKeywords.some((kw) => currentSummary.toLowerCase().includes(kw))) {
        matchedKeyword = true;
      }
    } else if (line.startsWith("SUMMARY;") && line.includes(":")) {
      const colonIdx = line.indexOf(":");
      currentSummary = unescapeICS(line.slice(colonIdx + 1));
      if (lowerKeywords.some((kw) => currentSummary.toLowerCase().includes(kw))) {
        matchedKeyword = true;
      }
    } else if (line.startsWith("DTSTART")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        currentStart = parseICSDate(line.slice(colonIdx + 1));
      }
    }
  }

  entries.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return entries;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, ics_url, keywords } = await req.json();

    if (!user_id || !ics_url) {
      return new Response(
        JSON.stringify({ error: "user_id and ics_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(ics_url, {
      headers: { "User-Agent": "My-Rhythm-App/1.0" },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch calendar: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const icsText = await response.text();
    const periods = parseICSForPeriods(icsText, keywords ?? ["period", "menstrual", "cycle", "menstruation"]);

    if (periods.length === 0) {
      return new Response(
        JSON.stringify({ added: 0, skipped: 0, total: 0, message: "No period events found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabase
      .from("cycle_logs")
      .select("period_start_date")
      .eq("user_id", user_id);

    const existingDates = new Set((existing ?? []).map((c: { period_start_date: string }) => c.period_start_date));
    const toInsert = periods.filter((p) => !existingDates.has(p.startDate));

    let added = 0;
    for (const p of toInsert) {
      const { data } = await supabase
        .from("cycle_logs")
        .insert({
          user_id,
          period_start_date: p.startDate,
          notes: `Imported from calendar: ${p.summary}`,
        })
        .select("*")
        .maybeSingle();
      if (data) added++;
    }

    const now = new Date().toISOString();
    await supabase
      .from("integration_settings")
      .upsert(
        {
          user_id,
          integration_key: "google_calendar_ics",
          enabled: true,
          settings: { ics_url, last_synced_at: now, last_sync_added: added },
          updated_at: now,
        },
        { onConflict: "user_id,integration_key" }
      );

    return new Response(
      JSON.stringify({ added, skipped: periods.length - toInsert.length, total: periods.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
