"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadStructure, Row, fmt } from "@/lib/data";
import { upload, safeName } from "@/lib/upload";
export default function Drawings() {
  const { id } = useParams<{ id: string }>();
  const [list, setList] = useState<any[]>([]), [isEng, setIsEng] = useState(false), [err, setErr] = useState(""), [pct, setPct] = useState<number | null>(null);
  const [S, setS] = useState<{ B: Row[]; F: Row[]; A: Row[] }>({ B: [], F: [], A: [] });
  const [f, setF] = useState<any>({ name: "", number: "", type: "", revision: "A", building_id: "", floor_id: "", area_id: "" }), [file, setFile] = useState<File | null>(null);
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { location.href = "/login"; return; }
    const m = await supabase.from("project_members").select("member_role").eq("project_id", id).eq("user_id", user.id).maybeSingle();
    setIsEng(m.data?.member_role === "engineer"); setS(await loadStructure(id));
    const d = await supabase.from("drawings").select("*").eq("project_id", id).order("created_at", { ascending: false });
    if (d.error) setErr(d.error.message); else setList(d.data);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!file) return setErr("Choose a PDF file.");
    if (file.type !== "application/pdf") return setErr("Only PDF files are accepted.");
    try {
      const path = `${id}/${crypto.randomUUID()}-${safeName(file.name)}`;
      setPct(0); await upload("drawings", path, file, 50 * 1048576, setPct);
      const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? null : v]));
      const { error } = await supabase.from("drawings").insert({ ...row, project_id: id, file_path: path, file_size: file.size });
      if (error) throw error;
      setFile(null); setF({ ...f, name: "", number: "" }); load();
    } catch (x: any) { setErr(x.message); } finally { setPct(null); }
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value, ...(k === "building_id" ? { floor_id: "", area_id: "" } : k === "floor_id" ? { area_id: "" } : {}) });
  const floors = S.F.filter(x => x.building_id === f.building_id), areas = S.A.filter(x => x.floor_id === f.floor_id);
  return (<div className="space-y-4">
    <h1 className="text-xl font-semibold">Drawings</h1>{err && <p className="text-sm text-red-600">{err}</p>}
    {isEng && <form onSubmit={submit} className="grid gap-2 rounded bg-white p-4 shadow sm:grid-cols-3">
      <input className="input" placeholder="Drawing name *" value={f.name} onChange={set("name")} required />
      <input className="input" placeholder="Drawing number" value={f.number} onChange={set("number")} />
      <input className="input" placeholder="Type (e.g. Architectural)" value={f.type} onChange={set("type")} />
      <input className="input" placeholder="Revision" value={f.revision} onChange={set("revision")} />
      <select className="input" value={f.building_id} onChange={set("building_id")}><option value="">Building (optional)</option>{S.B.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select className="input" value={f.floor_id} onChange={set("floor_id")} disabled={!f.building_id}><option value="">Floor</option>{floors.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select className="input" value={f.area_id} onChange={set("area_id")} disabled={!f.floor_id}><option value="">Area</option>{areas.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <input className="input sm:col-span-2" type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button className="btn" disabled={pct !== null}>{pct !== null ? `Uploading ${pct}%` : "Upload drawing (max 50 MB)"}</button>
    </form>}
    {list.length === 0 && <p className="text-slate-500">No drawings yet.</p>}
    <ul className="space-y-2">{list.map(d => <li key={d.id}><a className="block rounded bg-white p-3 shadow hover:ring-2 hover:ring-orange-400" href={`/projects/${id}/drawings/${d.id}`}>
      <b>{d.name}</b> <span className="text-sm text-slate-500">{d.number} · {d.type} · rev {d.revision} · {fmt(d.created_at)}</span></a></li>)}</ul>
  </div>);
}
