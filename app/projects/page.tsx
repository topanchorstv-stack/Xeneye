"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
type P = { id: string; name: string; number: string | null; client: string | null; status: string };
export default function Projects() {
  const [list, setList] = useState<P[]>([]), [role, setRole] = useState(""), [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", number: "", client: "", address: "", description: "", start_date: "", expected_completion: "" });
  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = "/login"; return; }
    const prof = await supabase.from("profiles").select("role").eq("id", user.id).single();
    setRole(prof.data?.role ?? "");
    const { data, error } = await supabase.from("projects").select("id,name,number,client,status").order("created_at", { ascending: false });
    if (error) setErr(error.message); else setList(data as P[]);
  }
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? null : v]));
    const { error } = await supabase.from("projects").insert(row);
    if (error) return setErr("Project not created: " + error.message);
    setF({ name: "", number: "", client: "", address: "", description: "", start_date: "", expected_completion: "" }); load();
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-2xl font-semibold">Projects</h1>
        <button className="btn-ghost" onClick={async () => { await supabase.auth.signOut(); location.href = "/login"; }}>Sign out</button></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {role === "engineer" && (
        <form onSubmit={create} className="grid gap-2 rounded bg-white p-4 shadow sm:grid-cols-2">
          <input className="input" placeholder="Project name *" value={f.name} onChange={set("name")} required />
          <input className="input" placeholder="Project number" value={f.number} onChange={set("number")} />
          <input className="input" placeholder="Client" value={f.client} onChange={set("client")} />
          <input className="input" placeholder="Address" value={f.address} onChange={set("address")} />
          <input className="input" type="date" title="Start date" value={f.start_date} onChange={set("start_date")} />
          <input className="input" type="date" title="Expected completion" value={f.expected_completion} onChange={set("expected_completion")} />
          <input className="input sm:col-span-2" placeholder="Description" value={f.description} onChange={set("description")} />
          <button className="btn sm:col-span-2">Create project</button>
        </form>)}
      {list.length === 0 && <p className="text-slate-500">{role === "engineer" ? "No projects yet. Create one above." : "You are not assigned to any project yet. Ask a project engineer to add you."}</p>}
      <ul className="space-y-2">{list.map(p => (
        <li key={p.id}><a href={`/projects/${p.id}`} className="block rounded bg-white p-4 shadow hover:ring-2 hover:ring-orange-400">
          <b>{p.name}</b> <span className="text-sm text-slate-500">{p.number} {p.client && `· ${p.client}`} · {p.status}</span></a></li>))}</ul>
    </div>);
}
