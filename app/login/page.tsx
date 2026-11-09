"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
export default function Login() {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [name, setName] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in"), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = mode === "in" ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    setBusy(false);
    if (r.error) return setMsg(r.error.message);
    if (mode === "up" && !r.data.session) return setMsg("Account created. Confirm your email, then sign in.");
    location.href = "/dashboard";
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-3 rounded bg-white p-6 shadow">
      <h1 className="text-xl font-semibold">{mode === "in" ? "Sign in" : "Create account"}</h1>
      {mode === "up" && <input className="input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />}
      <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input className="input" type="password" placeholder="Password (8+ characters)" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <button className="btn w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
      <button type="button" className="text-sm text-slate-500 underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}</button>
    </form>);
}
