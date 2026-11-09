"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
type Row = { id: string; name: string; building_id?: string; floor_id?: string };
export default function Project() {
  const { id } = useParams<{ id: string }>();
  const [proj, setProj] = useState<any>(null), [isEng, setIsEng] = useState(false), [err, setErr] = useState("");
  const [B, setB] = useState<Row[]>([]), [F, setF] = useState<Row[]>([]), [A, setA] = useState<Row[]>([]);
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = "/login"; return; }
    const [p, m, b, f, a] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("project_members").select("member_role").eq("project_id", id).eq("user_id", user.id).maybeSingle(),
      supabase.from("buildings").select("id,name").eq("project_id", id).order("created_at"),
      supabase.from("floors").select("id,name,building_id").eq("project_id", id).order("created_at"),
      supabase.from("areas").select("id,name,floor_id").eq("project_id", id).order("created_at")]);
    const e = p.error || b.error || f.error || a.error; if (e) setErr(e.message);
    setProj(p.data); setIsEng(m.data?.member_role === "engineer");
    setB((b.data ?? []) as Row[]); setF((f.data ?? []) as Row[]); setA((a.data ?? []) as Row[]);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function run(q: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await q; if (error) setErr(error.message); else { setErr(""); load(); }
  }
  const add = (table: string, extra: object, label: string) => { const name = prompt(`${label} name`)?.trim(); if (name) run(supabase.from(table).insert({ project_id: id, name, ...extra })); };
  const rename = (table: string, r: Row) => { const name = prompt("New name", r.name)?.trim(); if (name) run(supabase.from(table).update({ name }).eq("id", r.id)); };
  const del = (table: string, r: Row, what: string) => { if (confirm(`Remove ${r.name}? ${what}`)) run(supabase.from(table).delete().eq("id", r.id)); };
  const Acts = ({ t, r, what }: { t: string; r: Row; what: string }) => isEng ? (<>
    <button className="btn-ghost" onClick={() => rename(t, r)}>Rename</button>
    <button className="btn-ghost" onClick={() => del(t, r, what)}>Remove</button></>) : null;

  if (!proj) return <p>{err || "Loading… (or you do not have access to this project)"}</p>;
  return (
    <div className="space-y-4">
      <a href="/projects" className="text-sm text-slate-500">← Projects</a>
      <h1 className="text-2xl font-semibold">{proj.name} <span className="text-base font-normal text-slate-500">{proj.number}</span></h1>
      <p className="text-sm text-slate-600">{[proj.client, proj.address].filter(Boolean).join(" · ")}</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex items-center justify-between"><h2 className="font-semibold">Buildings, floors and areas</h2>
        {isEng && <button className="btn" onClick={() => add("buildings", {}, "Building")}>Add building</button>}</div>
      {B.length === 0 && <p className="text-slate-500">No buildings yet.</p>}
      {B.map(b => (
        <section key={b.id} className="rounded bg-white p-4 shadow">
          <div className="flex items-center gap-1"><b>{b.name}</b><Acts t="buildings" r={b} what="All its floors and areas are removed too." />
            {isEng && <button className="btn-ghost ml-auto" onClick={() => add("floors", { building_id: b.id }, "Floor")}>+ Floor</button>}</div>
          {F.filter(f => f.building_id === b.id).map(f => (
            <div key={f.id} className="ml-4 mt-2 border-l-2 border-slate-200 pl-3">
              <div className="flex items-center gap-1">{f.name}<Acts t="floors" r={f} what="Its areas are removed too." />
                {isEng && <button className="btn-ghost ml-auto" onClick={() => add("areas", { floor_id: f.id }, "Area")}>+ Area</button>}</div>
              {A.filter(a => a.floor_id === f.id).map(a => (
                <div key={a.id} className="ml-4 flex items-center gap-1 text-sm text-slate-600">{a.name}<Acts t="areas" r={a} what="" /></div>))}
            </div>))}
        </section>))}
    </div>);
}
