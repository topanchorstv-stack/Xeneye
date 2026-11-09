"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadStructure, Row, fmt } from "@/lib/data";
import { upload, safeName } from "@/lib/upload";
const CATS = ["design", "material_shortage", "labor_shortage", "equipment", "site_condition", "quality", "safety", "coordination", "other"];
const STAT = ["reported", "under_review", "assigned", "resolved", "closed"];
export default function Issues() {
  const { id } = useParams<{ id: string }>();
  const [S, setS] = useState<{ B: Row[]; F: Row[]; A: Row[] }>({ B: [], F: [], A: [] }), [issues, setIssues] = useState<any[]>([]), [drawings, setDrawings] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Record<string, { path: string; url: string }[]>>({}), [tz, setTz] = useState("UTC"), [err, setErr] = useState(""), [busy, setBusy] = useState(""), [files, setFiles] = useState<File[]>([]);
  const [f, setF] = useState<any>({ title: "", description: "", category: "other", severity: "medium", building_id: "", floor_id: "", area_id: "", drawing_id: "", drawing_page: "" });
  const load = useCallback(async () => {
    setS(await loadStructure(id));
    const [p, i, d, at] = await Promise.all([supabase.from("projects").select("timezone").eq("id", id).maybeSingle(),
      supabase.from("issues").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("drawings").select("id,name").eq("project_id", id),
      supabase.from("issue_attachments").select("issue_id,file_path").eq("project_id", id)]);
    setTz(p.data?.timezone ?? "UTC"); setDrawings(d.data ?? []);
    if (i.error) setErr(i.error.message); else setIssues(i.data);
    const paths = (at.data ?? []).map(a => a.file_path);
    const urls = paths.length ? (await supabase.storage.from("issue-photos").createSignedUrls(paths, 3600)).data ?? [] : [];
    const m: any = {}; (at.data ?? []).forEach((a, k) => { (m[a.issue_id] ??= []).push({ path: a.file_path, url: urls[k]?.signedUrl }); }); setPhotos(m);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy("Saving issue…");
    try {
      const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? null : v]));
      if (row.drawing_page) row.drawing_page = Number(row.drawing_page);
      // created_at / reported_by come from the database, not from this form
      const ins = await supabase.from("issues").insert({ ...row, project_id: id }).select("id").single();
      if (ins.error) throw ins.error;
      for (const [n, file] of files.entries()) {
        if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" is not an image.`);
        const path = `${id}/${ins.data.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
        setBusy(`Uploading photo ${n + 1}/${files.length}…`); await upload("issue-photos", path, file, 10 * 1048576, () => {});
        const a = await supabase.from("issue_attachments").insert({ project_id: id, issue_id: ins.data.id, file_path: path }); if (a.error) throw a.error;
      }
      setF({ ...f, title: "", description: "" }); setFiles([]); load();
    } catch (x: any) { setErr("Issue saved only partly or not at all: " + x.message); load(); } finally { setBusy(""); }
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value, ...(k === "building_id" ? { floor_id: "", area_id: "" } : k === "floor_id" ? { area_id: "" } : {}) });
  const setStatus = async (iid: string, status: string) => { const { error } = await supabase.from("issues").update({ status }).eq("id", iid); if (error) setErr(error.message); load(); };
  return (<div className="space-y-4"><h1 className="text-xl font-semibold">Issues</h1>{err && <p className="text-sm text-red-600">{err}</p>}
    <form onSubmit={submit} className="grid gap-2 rounded bg-white p-4 shadow sm:grid-cols-3">
      <input className="input sm:col-span-2" placeholder="Issue title *" value={f.title} onChange={set("title")} required />
      <select className="input" value={f.category} onChange={set("category")}>{CATS.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select>
      <textarea className="input sm:col-span-3" placeholder="Description" value={f.description} onChange={set("description")} />
      <select className="input" value={f.severity} onChange={set("severity")}>{["low", "medium", "high", "critical"].map(c => <option key={c}>{c}</option>)}</select>
      <select className="input" value={f.building_id} onChange={set("building_id")}><option value="">Building</option>{S.B.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select className="input" value={f.floor_id} onChange={set("floor_id")} disabled={!f.building_id}><option value="">Floor</option>{S.F.filter(x => x.building_id === f.building_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select className="input" value={f.area_id} onChange={set("area_id")} disabled={!f.floor_id}><option value="">Area</option>{S.A.filter(x => x.floor_id === f.floor_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select className="input" value={f.drawing_id} onChange={set("drawing_id")}><option value="">Related drawing</option>{drawings.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      <input className="input" type="number" min={1} placeholder="Drawing page" value={f.drawing_page} onChange={set("drawing_page")} />
      <input className="input sm:col-span-2" type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))} />
      <button className="btn" disabled={!!busy}>{busy || "Report issue"}</button></form>
    {issues.length === 0 && <p className="text-slate-500">No issues reported.</p>}
    {issues.map(i => <div key={i.id} className="rounded bg-white p-4 shadow"><div className="flex flex-wrap items-center gap-2"><b>{i.title}</b>
      <span className="text-xs text-slate-500">{i.category.replace("_", " ")} · {i.severity} · reported {fmt(i.created_at, tz)} ({tz})</span>
      <select className="input ml-auto w-auto" value={i.status} onChange={e => setStatus(i.id, e.target.value)}>{STAT.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></div>
      <p className="text-sm">{i.description}</p>
      <div className="mt-2 flex flex-wrap gap-2">{(photos[i.id] ?? []).map(p => <a key={p.path} href={p.url} target="_blank" download><img src={p.url} alt="Issue photo" className="h-20 w-20 rounded object-cover" /></a>)}</div></div>)}
  </div>);
}
