const IST = "Asia/Kolkata";

const isMissing = (v) => v == null || Number.isNaN(v);

export const fmtPrice = (v) =>
  isMissing(v)
    ? "—"
    : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export const fmtInt = (v) =>
  isMissing(v) ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

export const fmtNum = (v, digits = 2) => (isMissing(v) ? "—" : Number(v).toFixed(digits));

export const fmtPct = (v, digits = 2) =>
  isMissing(v) ? "—" : `${v > 0 ? "+" : ""}${Number(v).toFixed(digits)}%`;

function parseSafeDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function fmtDate(iso) {
  const d = parseSafeDate(iso);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: IST }).format(d);
  } catch {
    return "—";
  }
}

export function fmtDateTime(iso) {
  const d = parseSafeDate(iso);
  if (!d) return "—";
  try {
    const text = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: IST,
    }).format(d);
    return `${text} IST`;
  } catch {
    return "—";
  }
}

export function fmtAxisDate(iso) {
  const d = parseSafeDate(iso);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: IST }).format(d);
  } catch {
    return "";
  }
}

export function fmtTime(iso) {
  const d = parseSafeDate(iso);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST }).format(d);
  } catch {
    return "";
  }
}