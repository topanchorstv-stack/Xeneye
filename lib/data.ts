import { supabase } from "./supabase";
export type Row = { id: string; name: string; building_id?: string; floor_id?: string };
export async function loadStructure(id: string) {
  const [b, f, a] = await Promise.all([
    supabase.from("buildings").select("id,name").eq("project_id", id).order("created_at"),
    supabase.from("floors").select("id,name,building_id").eq("project_id", id).order("created_at"),
    supabase.from("areas").select("id,name,floor_id").eq("project_id", id).order("created_at")]);
  return { B: (b.data ?? []) as Row[], F: (f.data ?? []) as Row[], A: (a.data ?? []) as Row[] };
}
// Latest progress record per area (older records are history, never double counted).
export function latestByArea(recs: any[]) { const m: Record<string, any> = {}; for (const r of recs) if (!m[r.area_id]) m[r.area_id] = r; return m; }
export function areaValue(r?: any) { if (!r) return 0; if (r.status === "completed") return 100; if (r.status === "not_started") return 0; return r.percent ?? 0; }
export const avg = (n: number[]) => (n.length ? Math.round(n.reduce((s, x) => s + x, 0) / n.length) : 0);
export const fmt = (d: string, tz = "UTC") => { try { return new Date(d).toLocaleString("en-GB", { timeZone: tz }); } catch { return new Date(d).toISOString(); } };
