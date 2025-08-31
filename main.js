const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const ffmpegPathRaw  = require('ffmpeg-static');
const ffprobePathRaw = require('ffprobe-static').path;

function deAsar(p) {
  // パッケージ後は app.asar -> app.asar.unpacked に置換
  return p ? p.replace('app.asar', 'app.asar.unpacked') : p;
}

const ffmpegPath  = deAsar(ffmpegPathRaw);
const ffprobePath = deAsar(ffprobePathRaw);

if (!ffmpegPath) {
  console.error('ffmpeg binary not found via ffmpeg-static');
}
if (!ffprobePath) {
  console.error('ffprobe binary not found via ffprobe-static');
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

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { windowsHide: true });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', code => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(err || ('code ' + code)));
    });
  });
}

async function getFps(firstFile) {
  const { out } = await run(ffprobePath, [
    '-v','error',
    '-select_streams','v:0',
    '-show_entries','stream=avg_frame_rate',
    '-of','default=nokey=1:noprint_wrappers=1',
    firstFile
  ]);
  const frac = out.trim(); // e.g. '10000/357'
  const [num, den] = frac.split('/').map(x => parseFloat(x));
  if (!num || !den) throw new Error('Cannot parse avg_frame_rate: '+frac);
  return num/den;
}

async function getGopFrames(firstFile) {
  // Look for distance between first two I-frames (<= 400 frames to keep fast)
  const { out } = await run(ffprobePath, [
    '-v','error',
    '-select_streams','v:0',
    '-show_frames',
    '-show_entries','frame=pict_type',
    '-of','csv=p=0',
    firstFile
  ]);
  const lines = out.split(/\n/).filter(Boolean);
  let firstI = -1;
  for (let i=0;i<Math.min(lines.length, 400);i++) {
    if (lines[i].trim() === 'I') { firstI = i; break; }
  }
  if (firstI < 0) throw new Error('No I-frame found');
  for (let j = firstI+1; j < Math.min(lines.length, 400); j++) {
    if (lines[j].trim() === 'I') {
      return j - firstI; // GOP length in frames
    }
  }
  throw new Error('Second I-frame not found within first 400 frames');
}

async function autoDetectGopSeconds(firstFile) {
  const [fps, gopFrames] = await Promise.all([
    getFps(firstFile),
    getGopFrames(firstFile)
  ]);
  const sec = gopFrames / fps; // e.g., 14 / 28.011 ≈ 0.5
  return { fps, gopFrames, sec };
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

ipcMain.handle('auto-gop', async (evt, { files }) => {
  if (!files || files.length === 0) throw new Error('no files to analyze');
  const firstFile = files[0];
  const r = await autoDetectGopSeconds(firstFile);
  return r; // { fps, gopFrames, sec }
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
