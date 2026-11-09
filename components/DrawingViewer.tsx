"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import { supabase } from "@/lib/supabase";
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type Tool = "select" | "line" | "arrow" | "rect" | "circle" | "freehand";
type Status = "not_started" | "in_progress" | "completed" | "issue";
type Pt = { x: number; y: number }; // normalized 0..1 of the page: unaffected by zoom/resize
type Ann = { id: string; kind: Exclude<Tool, "select">; status: Status; page: number; geometry: { pts: Pt[] } };
const COLOR: Record<Status, string> = { not_started: "#64748b", in_progress: "#2563eb", completed: "#16a34a", issue: "#dc2626" };

export default function DrawingViewer({ drawingId, projectId, filePath, revision }:
  { drawingId: string; projectId: string; filePath: string; revision: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjs.PDFDocumentProxy>();
  const [page, setPage] = useState(1), [pages, setPages] = useState(1), [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState<Tool>("line"), [status, setStatus] = useState<Status>("in_progress");
  const [anns, setAnns] = useState<Ann[]>([]), [draft, setDraft] = useState<Pt[] | null>(null);
  const [sel, setSel] = useState<string | null>(null), [err, setErr] = useState("");

  useEffect(() => { (async () => { // private bucket: load via short-lived signed URL
    const { data, error } = await supabase.storage.from("drawings").createSignedUrl(filePath, 3600);
    if (error || !data) return setErr("Could not open drawing: " + (error?.message ?? "no access"));
    const doc = await pdfjs.getDocument(data.signedUrl).promise;
    pdfRef.current = doc; setPages(doc.numPages);
  })(); }, [filePath]);

  useEffect(() => { (async () => { // render current page at current zoom
    const doc = pdfRef.current; if (!doc || !canvas.current) return;
    const p = await doc.getPage(page), vp = p.getViewport({ scale: zoom * 1.5 });
    const c = canvas.current; c.width = vp.width; c.height = vp.height;
    setSize({ w: vp.width, h: vp.height });
    await p.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
  })(); }, [page, zoom, pages]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("drawing_annotations").select("*").eq("drawing_id", drawingId);
    if (error) setErr(error.message); else setAnns(data as Ann[]);
  }, [drawingId]);
  useEffect(() => { load(); }, [load]);

  const pt = (e: React.PointerEvent<SVGSVGElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool === "select") return;
    e.currentTarget.setPointerCapture(e.pointerId); setDraft([pt(e)]);
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draft) return;
    setDraft(tool === "freehand" ? [...draft, pt(e)] : [draft[0], pt(e)]);
  };
  const up = async () => {
    if (!draft || draft.length < 2 || tool === "select") return setDraft(null);
    const row = { project_id: projectId, drawing_id: drawingId, revision, page, kind: tool, status, geometry: { pts: draft } };
    setDraft(null);
    const { error } = await supabase.from("drawing_annotations").insert(row); // created_by/created_at set by DB
    if (error) setErr("Annotation not saved: " + error.message); else load();
  };
  const remove = async () => {
    if (!sel) return;
    const { error } = await supabase.from("drawing_annotations").delete().eq("id", sel);
    if (error) setErr(error.message);
    setSel(null); load();
  };
  const recolor = async (s: Status) => {
    setStatus(s);
    if (sel) { await supabase.from("drawing_annotations").update({ status: s }).eq("id", sel); load(); }
  };

  const shape = (a: { kind: string; status: Status; pts: Pt[]; id?: string }) => {
    const P = a.pts.map(p => ({ x: p.x * size.w, y: p.y * size.h })), s = P[0], e = P[P.length - 1];
    const key = a.id ?? "draft";
    const p = { stroke: COLOR[a.status], strokeWidth: a.id === sel ? 5 : 3, fill: "none",
      onClick: a.id ? () => tool === "select" && setSel(a.id!) : undefined,
      style: { cursor: tool === "select" ? "pointer" : "crosshair" } };
    if (a.kind === "rect") return <rect key={key} {...p} x={Math.min(s.x, e.x)} y={Math.min(s.y, e.y)} width={Math.abs(e.x - s.x)} height={Math.abs(e.y - s.y)} />;
    if (a.kind === "circle") return <ellipse key={key} {...p} cx={(s.x + e.x) / 2} cy={(s.y + e.y) / 2} rx={Math.abs(e.x - s.x) / 2} ry={Math.abs(e.y - s.y) / 2} />;
    if (a.kind === "freehand") return <polyline key={key} {...p} points={P.map(q => `${q.x},${q.y}`).join(" ")} />;
    const ang = Math.atan2(e.y - s.y, e.x - s.x), h = 14;
    return (
      <g key={key} onClick={p.onClick}>
        <line {...p} x1={s.x} y1={s.y} x2={e.x} y2={e.y} />
        {a.kind === "arrow" && <polyline {...p} points={`${e.x - h * Math.cos(ang - .5)},${e.y - h * Math.sin(ang - .5)} ${e.x},${e.y} ${e.x - h * Math.cos(ang + .5)},${e.y - h * Math.sin(ang + .5)}`} />}
      </g>
    );
  };

  return (
    <div ref={wrap} className="flex h-full flex-col bg-slate-100">
      <div className="flex flex-wrap items-center gap-2 bg-[#0b1b34] p-2 text-sm text-white">
        {(["select", "line", "arrow", "rect", "circle", "freehand"] as Tool[]).map(t =>
          <button key={t} onClick={() => setTool(t)} className={`rounded px-3 py-1 ${tool === t ? "bg-orange-500" : "bg-white/10"}`}>{t}</button>)}
        <span className="mx-2">|</span>
        {(Object.keys(COLOR) as Status[]).map(s =>
          <button key={s} onClick={() => recolor(s)} aria-label={s.replace("_", " ")} title={s.replace("_", " ")}
            className={`h-6 w-6 rounded-full border-2 ${status === s ? "border-white" : "border-transparent"}`} style={{ background: COLOR[s] }} />)}
        <button onClick={remove} disabled={!sel} className="rounded bg-red-600 px-3 py-1 disabled:opacity-40">Delete</button>
        <span className="ml-auto flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(.4, z - .2))}>−</button><span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + .2))}>+</button>
          <button onClick={() => setZoom(1)}>Fit</button>
          <button onClick={() => page > 1 && setPage(page - 1)}>‹</button><span>{page}/{pages}</span>
          <button onClick={() => page < pages && setPage(page + 1)}>›</button>
          <button onClick={() => wrap.current?.requestFullscreen()}>Fullscreen</button>
        </span>
      </div>
      {err && <p className="bg-red-100 p-2 text-sm text-red-800">{err}</p>}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative mx-auto bg-white" style={{ width: size.w }}>
          <canvas ref={canvas} className="block" />
          <svg className="absolute inset-0" width={size.w} height={size.h} style={{ touchAction: "none" }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up}>
            {anns.filter(a => a.page === page).map(a => shape({ ...a, pts: a.geometry.pts }))}
            {draft && shape({ kind: tool, status, pts: draft })}
          </svg>
        </div>
      </div>
    </div>
  );
}
