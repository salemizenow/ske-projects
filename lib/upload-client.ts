// Browser side of uploads: ask the server for a signed URL, then PUT the file straight to storage.
export type UploadedFile = { name: string; size: number; type: string; key: string | null };

export async function uploadFiles(files: File[], project: string | null): Promise<{ files: UploadedFile[]; warning?: string }> {
  const out: UploadedFile[] = []; let warning: string | undefined;
  for (const f of files) {
    const meta = { name: f.name, size: f.size, type: f.type || 'application/octet-stream' };
    const r = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, ...meta }) });
    const j = await r.json().catch(() => ({}));
    if (j.disabled) { out.push({ ...meta, key: null }); warning = 'File storage is not set up yet, so only file names were saved.'; continue; }
    if (!r.ok) throw new Error(j.error || 'Upload failed.');
    const put = await fetch(j.url, { method: 'PUT', body: f, headers: { 'Content-Type': meta.type } });
    if (!put.ok) throw new Error(`Could not upload ${f.name}.`);
    out.push({ ...meta, key: j.key });
  }
  return { files: out, warning };
}
