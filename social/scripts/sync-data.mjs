/**
 * Copy only the datasets the Instagram posts need from data/derived to
 * social/.generated/data. Files are copied unchanged; no analytical
 * processing happens here or anywhere in social/ - that belongs to the
 * Python pipeline. Resolve paths relative to this script so any working
 * directory can invoke it. A missing or unreadable input causes a non-zero
 * exit.
 */
import { constants } from 'node:fs';
import { access, copyFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = fileURLToPath(new URL('../../data/derived/', import.meta.url));
const destinationDir = fileURLToPath(new URL('../.generated/data/', import.meta.url));

// Post 1 (temporal) reads weekly_metrics.csv; post 2 (actors) reads actor_profiles.csv.
// Neither reads h3_weekly_metrics.csv or event_windows.csv, so those stay out of sync-data
// unlike web/scripts/sync-data.mjs, which supplies all four visualizations.
const filenames = ['weekly_metrics.csv', 'actor_profiles.csv', 'metadata.json'];

async function main() {
  // Check every input before replacing any previously copied dataset.
  for (const filename of filenames) {
    const source = join(sourceDir, filename);
    const info = await stat(source);
    if (!info.isFile()) {
      throw new Error(`Expected a dataset file: ${source}`);
    }
    await access(source, constants.R_OK);
  }

  await mkdir(destinationDir, { recursive: true });
  for (const filename of filenames) {
    await copyFile(join(sourceDir, filename), join(destinationDir, filename));
  }

  console.log(`Synced ${filenames.length} datasets to ${destinationDir}`);
}

try {
  await main();
} catch (error) {
  console.error(`Data sync failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
