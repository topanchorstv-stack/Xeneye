import "./globals.css";
export const metadata = { title: "XenEye" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>
    <header className="flex items-center gap-4 bg-[#0b1b34] px-6 py-3 text-sm text-slate-200">
      <a href="/dashboard" className="text-lg font-semibold text-white">Xen<span className="text-orange-500">Eye</span></a>
      <a href="/dashboard">Dashboard</a><a href="/projects">Projects</a></header>
    <main className="mx-auto max-w-5xl p-6">{children}</main></body></html>);
}
