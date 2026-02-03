import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import https from 'node:https';

const repo = 'lox-audioserver/adminui';
const assetName = 'admin-dist.tgz';
const release = process.env.ADMINUI_RELEASE ?? 'latest';
const distUrl =
  process.env.ADMINUI_DIST_URL ??
  (release === 'latest'
    ? `https://github.com/${repo}/releases/latest/download/${assetName}`
    : `https://github.com/${repo}/releases/download/${release}/${assetName}`);

const targetDir = join(process.cwd(), 'public', 'admin');
const customIndexPath = join(targetDir, 'index.html.custom');
const pluginSourcePath = join(process.cwd(), 'public', 'admin', 'audio-config-plugin.js');
const archivePath = join(tmpdir(), `admin-dist-${Date.now()}.tgz`);

async function download(url, dest, redirects = 0) {
  if (redirects > 5) {
    throw new Error(`Too many redirects while downloading ${url}`);
  }

  await new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { 'User-Agent': 'lox-audioserver-admin-fetch' } },
      (response) => {
        const status = response.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          response.resume();
          resolve(download(response.headers.location, dest, redirects + 1));
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`Failed to download admin dist (${status}) from ${url}`));
          return;
        }

        pipeline(response, createWriteStream(dest)).then(resolve).catch(reject);
      },
    );

    request.on('error', reject);
  });
}

async function extract(archive, dest) {
  await new Promise((resolve, reject) => {
    const proc = spawn('tar', ['-xzf', archive, '-C', dest], { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`tar exited with code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

// Backup plugin file before deletion
let pluginCode = null;
try {
  pluginCode = await fs.readFile(pluginSourcePath, 'utf-8');
  console.log('✓ Backed up plugin code');
} catch (e) {
  console.warn('⚠ Plugin file not found, will skip restoration');
}

// Backup custom index.html if it exists
let customIndexContent = null;
try {
  customIndexContent = await fs.readFile(join(targetDir, 'index.html'), 'utf-8');
  if (customIndexContent && customIndexContent.includes('Audio Config') && customIndexContent.includes('audioConfigPlugin')) {
    console.log('✓ Preserving custom Audio Config index.html');
  } else {
    customIndexContent = null;
  }
} catch (e) {
  // File doesn't exist, that's fine
}

await fs.rm(targetDir, { recursive: true, force: true });
await fs.mkdir(targetDir, { recursive: true });

await download(distUrl, archivePath);
await extract(archivePath, targetDir);
await fs.rm(archivePath, { force: true });

// Inject Audio Config Plugin into downloaded index.html - MUST HAPPEN BEFORE PLUGIN RESTORE
async function addPluginLoaderToIndex() {
  const indexPath = join(targetDir, 'index.html');
  let indexContent = await fs.readFile(indexPath, 'utf-8');
  
  // Add plugin loader before closing body
  const loaderScript = `    <!-- Load Audio Config Plugin -->
    <script>
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    const script = document.createElement('script');
                    script.src = '/admin/audio-config-plugin.js';
                    document.body.appendChild(script);
                }, 500);
            });
        } else {
            setTimeout(() => {
                const script = document.createElement('script');
                script.src = '/admin/audio-config-plugin.js';
                document.body.appendChild(script);
            }, 500);
        }
    </script>`;
  
  if (indexContent.includes('</body>')) {
    indexContent = indexContent.replace('  </body>', loaderScript + '\n  </body>');
    await fs.writeFile(indexPath, indexContent, 'utf-8');
    console.log('✓ Added plugin loader to index.html');
  } else {
    console.warn('⚠ Could not find </body> in index.html');
  }
}

await addPluginLoaderToIndex();

// Restore custom index.html if it was backed up
if (customIndexContent) {
  await fs.writeFile(join(targetDir, 'index.html'), customIndexContent, 'utf-8');
  console.log('✓ Restored custom Audio Config index.html');
}

// Restore plugin file
if (pluginCode) {
  await fs.writeFile(pluginSourcePath, pluginCode, 'utf-8');
  console.log('✓ Restored plugin code');
}
