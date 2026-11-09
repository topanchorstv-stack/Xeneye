"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
export default function Members() {
  const { id } = useParams<{ id: string }>();
  const [list, setList] = useState<any[]>([]), [email, setEmail] = useState(""), [role, setRole] = useState("subcontractor"), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const m = await supabase.from("project_members").select("user_id,member_role").eq("project_id", id);
    const ids = (m.data ?? []).map(x => x.user_id);
    const p = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] as any[] };
    setList((m.data ?? []).map(x => ({ ...x, name: p.data?.find((y: any) => y.id === x.user_id)?.full_name ?? x.user_id })));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function add(e: React.FormEvent) { e.preventDefault(); setErr("");
    const { error } = await supabase.rpc("add_member_by_email", { pid: id, member_email: email, r: role });
    if (error) setErr(error.message); else { setEmail(""); load(); } }
  return (<div className="space-y-4"><h1 className="text-xl font-semibold">Members</h1>{err && <p className="text-sm text-red-600">{err}</p>}
    <form onSubmit={add} className="flex gap-2 rounded bg-white p-4 shadow"><input className="input" type="email" placeholder="Email of an existing account" value={email} onChange={e => setEmail(e.target.value)} required />
      <select className="input w-auto" value={role} onChange={e => setRole(e.target.value)}><option value="subcontractor">Subcontractor</option><option value="engineer">Engineer</option></select><button className="btn">Add</button></form>
    <ul className="rounded bg-white p-4 shadow">{list.map(m => <li key={m.user_id} className="text-sm">{m.name} · {m.member_role}</li>)}</ul></div>);
}
