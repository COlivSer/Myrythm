export interface ICSPeriodEntry {
  startDate: string;
  endDate: string | null;
  summary: string;
}

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
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

export function parseICSForPeriods(icsText: string, keywords: string[] = ['period', 'menstrual', 'cycle', 'menstruation']): ICSPeriodEntry[] {
  const entries: ICSPeriodEntry[] = [];
  const lines = icsText.split(/\r?\n/);
  let inEvent = false;
  let currentSummary = '';
  let currentStart: string | null = null;
  let currentEnd: string | null = null;
  let matchedKeyword = false;

  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentSummary = '';
      currentStart = null;
      currentEnd = null;
      matchedKeyword = false;
      continue;
    }
    if (line === 'END:VEVENT') {
      if (inEvent && matchedKeyword && currentStart) {
        entries.push({
          startDate: currentStart,
          endDate: currentEnd,
          summary: currentSummary,
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    if (line.startsWith('SUMMARY:')) {
      currentSummary = unescapeICS(line.slice('SUMMARY:'.length));
      if (lowerKeywords.some((kw) => currentSummary.toLowerCase().includes(kw))) {
        matchedKeyword = true;
      }
    } else if (line.startsWith('SUMMARY;') && line.includes(':')) {
      const colonIdx = line.indexOf(':');
      currentSummary = unescapeICS(line.slice(colonIdx + 1));
      if (lowerKeywords.some((kw) => currentSummary.toLowerCase().includes(kw))) {
        matchedKeyword = true;
      }
    } else if (line.startsWith('DTSTART')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        currentStart = parseICSDate(line.slice(colonIdx + 1));
      }
    } else if (line.startsWith('DTEND')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        currentEnd = parseICSDate(line.slice(colonIdx + 1));
      }
    }
  }

  entries.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return entries;
}
