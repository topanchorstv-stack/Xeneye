"use client";
import { useParams, usePathname } from "next/navigation";
export default function L({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>(); const p = usePathname();
  const tabs = [["", "Structure"], ["/drawings", "Drawings"], ["/progress", "Progress"], ["/issues", "Issues"], ["/members", "Members"]];
  return (<div><nav className="mb-4 flex gap-1 overflow-x-auto border-b">{tabs.map(([h, l]) => {
    const href = `/projects/${id}${h}`, on = h === "" ? p === href : p.startsWith(href);
    return <a key={h} href={href} className={`px-3 py-2 text-sm ${on ? "border-b-2 border-orange-500 font-semibold" : "text-slate-500"}`}>{l}</a>; })}</nav>{children}</div>);
}
