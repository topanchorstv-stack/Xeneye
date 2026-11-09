"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { latestByArea, areaValue, avg, fmt } from "@/lib/data";
export default function Dashboard() {
  const [d, setD] = useState<any>(null), [err, setErr] = useState("");
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { location.href = "/login"; return; }
    const [pr, is, dr, ar, pg, fl, bl] = await Promise.all([
      supabase.from("projects").select("id,name,status"),
      supabase.from("issues").select("id,title,severity,status,created_at,project_id").order("created_at", { ascending: false }),
      supabase.from("drawings").select("id,name,project_id,created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("areas").select("id,project_id,floor_id"), supabase.from("progress_records").select("*").order("created_at", { ascending: false }),
      supabase.from("floors").select("id,building_id"), supabase.from("buildings").select("id")]);
    const e = pr.error || is.error || dr.error || ar.error || pg.error; if (e) return setErr(e.message);
    const L = latestByArea(pg.data ?? []);
    const prog = (pr.data ?? []).map(p => ({ ...p, pct: avg((ar.data ?? []).filter(a => a.project_id === p.id).map(a => areaValue(L[a.id]))) }));
    setD({ prog, projects: pr.data ?? [], active: (pr.data ?? []).filter(p => p.status === "active").length, floors: fl.data?.length ?? 0, buildings: bl.data?.length ?? 0,
      open: (is.data ?? []).filter(i => !["resolved", "closed"].includes(i.status)), recentIssues: (is.data ?? []).slice(0, 5), drawings: dr.data ?? [], updates: (pg.data ?? []).slice(0, 5) });
  })(); }, []);
  if (err) return <p className="text-red-600">{err}</p>; if (!d) return <p>Loading…</p>;
  const Stat = ({ l, v }: { l: string; v: any }) => <div className="rounded bg-white p-4 shadow"><div className="text-2xl font-semibold">{v}</div><div className="text-sm text-slate-500">{l}</div></div>;
  return (<div className="space-y-5"><h1 className="text-2xl font-semibold">Dashboard</h1>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Stat l="Projects" v={d.projects.length} /><Stat l="Active" v={d.active} /><Stat l="Open issues" v={d.open.length} /><Stat l="Buildings" v={d.buildings} /><Stat l="Floors" v={d.floors} /></div>
    {d.projects.length === 0 && <p className="text-slate-500">No projects yet. <a className="underline" href="/projects">Go to Projects</a>.</p>}
    <section className="rounded bg-white p-4 shadow"><h2 className="mb-2 font-semibold">Estimated progress</h2>{d.prog.map((p: any) => <a key={p.id} href={`/projects/${p.id}/progress`} className="flex items-center justify-between py-1 text-sm">{p.name}
      <span className="flex w-48 items-center gap-2"><span className="h-2 flex-1 rounded bg-slate-200"><span className="block h-2 rounded bg-green-600" style={{ width: p.pct + "%" }} /></span>{p.pct}%</span></a>)}</section>
    <div className="grid gap-3 sm:grid-cols-3">
      <section className="rounded bg-white p-4 shadow"><h2 className="font-semibold">Recent issues</h2>{d.recentIssues.map((i: any) => <a key={i.id} href={`/projects/${i.project_id}/issues`} className="block text-sm">{i.title} <span className="text-slate-500">{i.severity} · {fmt(i.created_at)}</span></a>)}</section>
      <section className="rounded bg-white p-4 shadow"><h2 className="font-semibold">Recent drawings</h2>{d.drawings.map((x: any) => <a key={x.id} href={`/projects/${x.project_id}/drawings/${x.id}`} className="block text-sm">{x.name} <span className="text-slate-500">{fmt(x.created_at)}</span></a>)}</section>
      <section className="rounded bg-white p-4 shadow"><h2 className="font-semibold">Recent progress</h2>{d.updates.map((u: any) => <div key={u.id} className="text-sm">{u.status.replace("_", " ")} {u.percent}% <span className="text-slate-500">{fmt(u.created_at)}</span></div>)}</section></div></div>);
}
