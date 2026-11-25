import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "replays";

/** Every file path under a folder of the replays bucket, recursing into subfolders. */
async function listAll(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 });
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    // Folders come back without an id.
    if (item.id) out.push(path);
    else out.push(...(await listAll(admin, path)));
  }
  return out;
}

/**
 * Remove stored recordings, screenshots and diagnostics. The worker writes each run's files
 * under `<workspace_id>/<run_id>/...`, so a folder is either one run or a whole workspace.
 * Returns how many files were removed.
 */
export async function removeReplayFolders(admin: SupabaseClient, folders: string[]): Promise<number> {
  let removed = 0;
  for (const folder of folders) {
    const paths = await listAll(admin, folder);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
      if (error) throw new Error(`Removing files failed: ${error.message}`);
      removed += Math.min(100, paths.length - i);
    }
  }
  return removed;
}
