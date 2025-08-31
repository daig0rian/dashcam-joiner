const $ = sel => document.querySelector(sel);

let state = {
  dir: null,
  groups: [],
  selectedKey: null,
  files: [],
  outPath: null
};

function log(msg) {
  const pre = $('#console');
  pre.textContent += msg;
  if (!msg.endsWith('\n')) pre.textContent += '\n';
  pre.scrollTop = pre.scrollHeight;
}

function renderGroups() {
  const host = $('#groupList');
  host.innerHTML = '';
  state.groups.forEach(g => {
    const card = document.createElement('label');
    card.className = 'card';
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = 'group';
    r.value = g.key;
    r.addEventListener('change', async () => {
      state.selectedKey = g.key;
      state.files = await window.api.listGroupFiles(state.dir, g.key);
      $('#autoInfo').textContent = '';
      renderFiles();
    });
    if (g.key === state.selectedKey) r.checked = true;
    const span = document.createElement('span');
    span.textContent = `${g.key}  (${g.count} files)`;
    card.appendChild(r);
    card.appendChild(span);
    host.appendChild(card);
  });
}

function renderFiles() {
  const ol = $('#fileList');
  ol.innerHTML = '';
  state.files.forEach((f, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx+1}. ${f}`;
    ol.appendChild(li);
  });
  $('#btnMerge').disabled = !(state.files && state.files.length >= 2 && state.outPath);
}

$('#btnChoose').addEventListener('click', async () => {
  const res = await window.api.chooseFolder();
  if (!res) return;
  state.dir = res.dir;
  state.groups = res.groups;
  state.selectedKey = null;
  state.files = [];
  state.outPath = null;
  $('#console').textContent = '';
  $('#autoInfo').textContent = '';
  renderGroups();
  renderFiles();
});

$('#btnSave').addEventListener('click', async () => {
  if (!state.selectedKey) { alert('Select a group first'); return; }
  const suggested = state.selectedKey + '.mp4';
  const out = await window.api.chooseSave(suggested);
  if (!out) return;
  state.outPath = out;
  renderFiles();
});

$('#btnMerge').addEventListener('click', async () => {
  const gopSec = parseFloat($('#gopSec').value || '0.5');
  if (!state.files || state.files.length < 2) { alert('Need at least 2 files'); return; }
  if (!state.outPath) { alert('Choose an output path'); return; }
  $('#btnMerge').disabled = true;
  log(`Merging ${state.files.length} files with GOP cut = ${gopSec.toFixed(3)}s`);
  await window.api.startMerge(state.files, gopSec, state.outPath);
});

$('#btnAuto').addEventListener('click', async () => {
  if (!state.files || state.files.length === 0) { alert('Pick a group first'); return; }
  try {
    $('#autoInfo').textContent = 'Detecting…';
    const r = await window.api.autoGop(state.files);
    $('#gopSec').value = r.sec.toFixed(3);
    $('#autoInfo').textContent = `Detected: GOP ${r.gopFrames} frames @ ${r.fps.toFixed(3)} fps → ${r.sec.toFixed(3)} s`;
    log(`[Auto] fps=${r.fps.toFixed(3)}, gopFrames=${r.gopFrames}, gopSec=${r.sec.toFixed(3)}s`);
  } catch (e) {
    $('#autoInfo').textContent = 'Auto-detect failed: ' + e.message;
    log('[Auto] failed: ' + e.message);
  }
});

window.api.onLog(msg => log(msg));
window.api.onDone(({ ok, outPath, error }) => {
  if (ok) log(`\n✅ Done → ${outPath}`);
  else log(`\n❌ Error: ${error}`);
  $('#btnMerge').disabled = false;
});
