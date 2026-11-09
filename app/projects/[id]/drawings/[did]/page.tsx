"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
const Viewer = dynamic(() => import("@/components/DrawingViewer"), { ssr: false });
export default function Page() {
  const { id, did } = useParams<{ id: string; did: string }>();
  const [d, setD] = useState<any>(null), [msg, setMsg] = useState("Loading…");
  useEffect(() => { supabase.from("drawings").select("*").eq("id", did).maybeSingle().then(r => r.data ? setD(r.data) : setMsg(r.error?.message ?? "Drawing not found or no access.")); }, [did]);
  if (!d) return <p>{msg}</p>;
  return (<div><a href={`/projects/${id}/drawings`} className="text-sm text-slate-500">← Drawings</a>
    <h1 className="mb-2 text-lg font-semibold">{d.name} <span className="text-sm font-normal text-slate-500">rev {d.revision}</span></h1>
    <div style={{ height: "78vh" }} className="overflow-hidden rounded border">
      <Viewer drawingId={d.id} projectId={id} filePath={d.file_path} revision={d.revision ?? ""} /></div></div>);
}
