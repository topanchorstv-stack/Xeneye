import { supabase } from "./supabase";
// Direct browser -> Supabase Storage upload with progress (no server route).
export async function upload(bucket: string, path: string, file: File, maxBytes: number, onProgress: (pct: number) => void) {
  if (file.size > maxBytes) throw new Error(`"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB; the limit is ${maxBytes / 1048576} MB.`);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You are signed out. Sign in again.");
  await new Promise<void>((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("POST", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    x.setRequestHeader("Authorization", "Bearer " + session.access_token);
    x.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    x.upload.onprogress = e => e.lengthComputable && onProgress(Math.round(e.loaded / e.total * 100));
    x.onload = () => (x.status < 300 ? res() : rej(new Error(`Upload failed (${x.status}): ${x.responseText}`)));
    x.onerror = () => rej(new Error("Network error during upload."));
    x.send(file);
  });
}
export const safeName = (n: string) => n.replace(/[^\w.\-]+/g, "_");
