const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

if (!ffmpegPath) {
  console.error('ffmpeg binary not found via ffmpeg-static');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('renderer.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- Helpers ----
function listMp4Groups(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.mp4'))
    .map(f => path.join(dir, f))
    .sort((a, b) => a.localeCompare(b, 'en')); // lexicographic → your filenames are chronological

  // Group by first two underscore tokens: e.g. F_20250828184000
  const groups = new Map();
  for (const full of files) {
    const base = path.basename(full);
    const tokens = base.split('_');
    if (tokens.length < 2) continue;
    const key = tokens[0] + '_' + tokens[1];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(full);
  }
  // Convert to array of {key, files}
  return Array.from(groups.entries()).map(([key, files]) => ({ key, files }));
}

function writeConcatList(tempDir, files, gopSec) {
  const listPath = path.join(tempDir, `concat_${Date.now()}.txt`);
  const lines = [];
  files.forEach((f, idx) => {
    // file line must be first, then optional inpoint line
    lines.push(`file '${f.replace(/'/g, "'\\''")}'`);
    if (idx > 0 && gopSec > 0) {
      lines.push(`inpoint ${gopSec.toFixed(3)}`);
    }
  });
  fs.writeFileSync(listPath, lines.join(os.EOL), { encoding: 'utf8' });
  return listPath;
}

function runFfmpegConcat(listPath, outPath, onData) {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath];
    const proc = spawn(ffmpegPath, args, { windowsHide: true });

    proc.stdout.on('data', d => onData && onData(d.toString()));
    proc.stderr.on('data', d => onData && onData(d.toString())); // ffmpeg logs to stderr

    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg exited with code ' + code));
    });
  });
}

// ---- IPC ----
ipcMain.handle('choose-folder', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || res.filePaths.length === 0) return null;
  const dir = res.filePaths[0];
  const groups = listMp4Groups(dir).map(g => ({ key: g.key, count: g.files.length }));
  return { dir, groups };
});

ipcMain.handle('list-group-files', async (evt, { dir, key }) => {
  const allGroups = listMp4Groups(dir);
  const g = allGroups.find(x => x.key === key);
  if (!g) return [];
  return g.files; // array of absolute paths (sorted)
});

ipcMain.handle('choose-save', async (evt, { suggestedName }) => {
  const res = await dialog.showSaveDialog({
    title: 'Save merged MP4',
    defaultPath: suggestedName || 'output.mp4',
    filters: [ { name: 'MP4', extensions: ['mp4'] } ]
  });
  if (res.canceled || !res.filePath) return null;
  return res.filePath;
});

ipcMain.handle('start-merge', async (evt, { files, gopSec, outPath }) => {
  const webContents = evt.sender;
  const tempDir = app.getPath('temp');
  try {
    if (!files || files.length < 2) throw new Error('Need at least 2 files to merge');
    const listPath = writeConcatList(tempDir, files, gopSec);
    webContents.send('log', `list.txt → ${listPath}`);
    await runFfmpegConcat(listPath, outPath, msg => webContents.send('log', msg));
    webContents.send('done', { ok: true, outPath });
  } catch (e) {
    webContents.send('done', { ok: false, error: e.message });
  }
});
