const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  listGroupFiles: (dir, key) => ipcRenderer.invoke('list-group-files', { dir, key }),
  chooseSave: (suggestedName) => ipcRenderer.invoke('choose-save', { suggestedName }),
  startMerge: (files, gopSec, outPath) => ipcRenderer.invoke('start-merge', { files, gopSec, outPath }),
  autoGop: (files) => ipcRenderer.invoke('auto-gop', { files }),
  onLog: (cb) => ipcRenderer.on('log', (_e, msg) => cb(msg)),
  onDone: (cb) => ipcRenderer.on('done', (_e, payload) => cb(payload))
});