"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadStructure, Row, latestByArea, areaValue, avg, fmt } from "@/lib/data";
const Bar = ({ v }: { v: number }) => <span className="inline-flex w-40 items-center gap-2"><span className="h-2 flex-1 rounded bg-slate-200"><span className="block h-2 rounded bg-green-600" style={{ width: v + "%" }} /></span><span className="w-9 text-right text-xs">{v}%</span></span>;
export default function Progress() {
  const { id } = useParams<{ id: string }>();
  const [S, setS] = useState<{ B: Row[]; F: Row[]; A: Row[] }>({ B: [], F: [], A: [] }), [recs, setRecs] = useState<any[]>([]), [err, setErr] = useState("");
  const [u, setU] = useState({ area_id: "", status: "in_progress", percent: "50", note: "" });
  const load = useCallback(async () => {
    setS(await loadStructure(id));
    const r = await supabase.from("progress_records").select("*").eq("project_id", id).order("created_at", { ascending: false });
    if (r.error) setErr(r.error.message); else setRecs(r.data);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const L = latestByArea(recs), val = (a: Row) => areaValue(L[a.id]);
  const floorV = (f: Row) => avg(S.A.filter(a => a.floor_id === f.id).map(val));
  const bV = (b: Row) => avg(S.F.filter(f => f.building_id === b.id).map(floorV));
  const total = avg(S.A.map(val));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!u.area_id) return setErr("Choose an area.");
    const percent = u.status === "completed" ? 100 : u.status === "not_started" ? 0 : Number(u.percent);
    const { error } = await supabase.from("progress_records").insert({ project_id: id, area_id: u.area_id, status: u.status, percent, note: u.note || null });
    if (error) setErr(error.message); else { setU({ ...u, note: "" }); load(); }
  }
  return (<div className="space-y-4">
    <h1 className="text-xl font-semibold">Progress <span className="text-sm font-normal text-slate-500">(estimated: each area counts equally, using its latest update)</span></h1>
    {err && <p className="text-sm text-red-600">{err}</p>}
    <div className="rounded bg-white p-4 shadow"><div className="flex items-center justify-between font-semibold">Overall <Bar v={total} /></div>
      {S.B.map(b => <div key={b.id} className="mt-3"><div className="flex items-center justify-between font-medium">{b.name}<Bar v={bV(b)} /></div>
        {S.F.filter(f => f.building_id === b.id).map(f => <div key={f.id} className="ml-4 mt-1"><div className="flex items-center justify-between text-sm">{f.name}<Bar v={floorV(f)} /></div>
          {S.A.filter(a => a.floor_id === f.id).map(a => <div key={a.id} className="ml-4 flex items-center justify-between text-xs text-slate-600">{a.name} · {(L[a.id]?.status ?? "not_started").replace("_", " ")}<Bar v={val(a)} /></div>)}</div>)}</div>)}
      {S.A.length === 0 && <p className="text-slate-500">Add areas on the Structure tab first.</p>}</div>
    <form onSubmit={save} className="grid gap-2 rounded bg-white p-4 shadow sm:grid-cols-5">
      <select className="input" value={u.area_id} onChange={e => setU({ ...u, area_id: e.target.value })}><option value="">Area…</option>
        {S.A.map(a => { const f = S.F.find(x => x.id === a.floor_id), b = S.B.find(x => x.id === f?.building_id); return <option key={a.id} value={a.id}>{b?.name} / {f?.name} / {a.name}</option>; })}</select>
      <select className="input" value={u.status} onChange={e => setU({ ...u, status: e.target.value })}>{["not_started", "in_progress", "completed", "issue"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
      <input className="input" type="number" min={0} max={100} value={u.percent} onChange={e => setU({ ...u, percent: e.target.value })} disabled={u.status === "completed" || u.status === "not_started"} />
      <input className="input" placeholder="Note" value={u.note} onChange={e => setU({ ...u, note: e.target.value })} /><button className="btn">Record update</button></form>
    <ul className="text-sm text-slate-600">{recs.slice(0, 8).map(r => <li key={r.id}>{fmt(r.created_at)} · {S.A.find(a => a.id === r.area_id)?.name} · {r.status.replace("_", " ")} {r.percent}% {r.note}</li>)}</ul>
  </div>);
}
