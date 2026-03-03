/**
 * 个人信息 CSV：导出为文件下载，从本地文件加载。支持记住 data 目录并直接写入。
 */
(function(global) {
  var PROFILE_HEADER = '\u8EAB\u9AD8,\u4F53\u91CD,\u51FA\u751F\u65E5\u671F,\u6027\u522B,\u6D3B\u52A8\u91CF,\u663E\u793A\u540D';
  var WEIGHT_HEADER = '\u65E5\u671F,\u4F53\u91CD';
  var IDB_NAME = 'fit-app';
  var IDB_STORE = 'store';
  var KEY_DATA_DIR = 'dataDir';

  function openDb() {
    return new Promise(function(res, rej) {
      var r = indexedDB.open(IDB_NAME, 1);
      r.onerror = function() { rej(r.error); };
      r.onsuccess = function() { res(r.result); };
      r.onupgradeneeded = function() {
        if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE);
      };
    });
  }
  function saveDataDirHandle(handle) {
    return openDb().then(function(db) {
      return new Promise(function(res, rej) {
        var t = db.transaction(IDB_STORE, 'readwrite');
        t.objectStore(IDB_STORE).put(handle, KEY_DATA_DIR);
        t.oncomplete = function() { res(); };
        t.onerror = function() { rej(t.error); };
      });
    });
  }
  function getDataDirHandle() {
    return openDb().then(function(db) {
      return new Promise(function(res, rej) {
        var t = db.transaction(IDB_STORE, 'readonly');
        var req = t.objectStore(IDB_STORE).get(KEY_DATA_DIR);
        req.onsuccess = function() { res(req.result || null); };
        req.onerror = function() { rej(req.error); };
      });
    });
  }

  function escapeCsvField(s) {
    if (s == null) return '';
    var t = String(s);
    if (t.indexOf(',') >= 0 || t.indexOf('"') >= 0 || t.indexOf('\n') >= 0)
      return '"' + t.replace(/"/g, '""') + '"';
    return t;
  }

  function getWeightRecords() {
    try {
      var raw = localStorage.getItem('fit-weight-records');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function buildUserCsv() {
    var height = localStorage.getItem('fit-height-cm') || '';
    var weightOverride = localStorage.getItem('fit-calorie-weight-override') || '';
    if (!weightOverride) {
      var recs = getWeightRecords();
      if (recs.length) {
        recs.sort(function(a, b) { return b.date.localeCompare(a.date); });
        weightOverride = recs[0].weight;
      }
    }
    var birthdate = localStorage.getItem('fit-calorie-birthdate') || '';
    var gender = localStorage.getItem('fit-calorie-gender') || 'male';
    var activity = localStorage.getItem('fit-calorie-activity') || '1.55';
    var displayName = localStorage.getItem('fit-username') || '';
    var profileRow = [height, weightOverride, birthdate.slice(0, 10), gender, activity, displayName].map(escapeCsvField).join(',');
    var lines = [
      '\uFEFF' + PROFILE_HEADER,
      profileRow,
      '',
      WEIGHT_HEADER
    ];
    var recs = getWeightRecords();
    recs.sort(function(a, b) { return a.date.localeCompare(b.date); });
    recs.forEach(function(r) { lines.push(r.date + ',' + r.weight); });
    return lines.join('\n');
  }

  function parseCsvLine(line) {
    var out = [];
    var inQuote = false;
    var cur = '';
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (inQuote) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQuote = false;
        else cur += c;
      } else {
        if (c === '"') inQuote = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  }

  function parseUserCsv(csvText) {
    var lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 2) return;
    var profileRow = parseCsvLine(lines[1]);
    if (profileRow.length >= 1 && profileRow[0]) localStorage.setItem('fit-height-cm', String(profileRow[0]).trim());
    if (profileRow.length >= 2 && profileRow[1]) localStorage.setItem('fit-calorie-weight-override', String(profileRow[1]).trim());
    if (profileRow.length >= 3 && profileRow[2]) localStorage.setItem('fit-calorie-birthdate', String(profileRow[2]).trim().slice(0, 10));
    if (profileRow.length >= 4 && profileRow[3]) localStorage.setItem('fit-calorie-gender', String(profileRow[3]).trim() || 'male');
    if (profileRow.length >= 5 && profileRow[4]) localStorage.setItem('fit-calorie-activity', String(profileRow[4]).trim() || '1.55');
    if (profileRow.length >= 6) localStorage.setItem('fit-username', String(profileRow[5]).trim());
    var weightRecords = [];
    var weightStart = -1;
    for (var i = 2; i < lines.length; i++) {
      if (lines[i].indexOf('\u65E5\u671F') >= 0 && lines[i].indexOf('\u4F53\u91CD') >= 0) {
        weightStart = i + 1;
        break;
      }
    }
    if (weightStart >= 0) {
      for (i = weightStart; i < lines.length; i++) {
        var parts = parseCsvLine(lines[i]);
        if (parts.length >= 2) {
          var date = String(parts[0]).trim();
          var w = parseFloat(String(parts[1]).trim().replace(/,/g, ''), 10);
          if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(w) && w >= 20 && w <= 300)
            weightRecords.push({ date: date, weight: w });
        }
      }
    }
    if (weightRecords.length > 0) localStorage.setItem('fit-weight-records', JSON.stringify(weightRecords));
  }

  function downloadCsv(filename) {
    var csv = buildUserCsv();
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (filename || 'fit-user') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadFromFileContent(csvText) {
    parseUserCsv(csvText);
  }

  function writeCsvToDirHandle(dirHandle, fileName, csv) {
    return dirHandle.getFileHandle(fileName, { create: true })
      .then(function(fileHandle) { return fileHandle.createWritable(); })
      .then(function(writable) {
        return writable.write(csv).then(function() { return writable.close(); });
      });
  }

  /**
   * 将当前用户 CSV 写入已记住的 data 目录，若无则先让用户选择并记住。
   * @param {string} filename - 文件名（不含 .csv），默认 fit-user
   * @returns {Promise<string>} 成功时返回写入的文件名
   */
  function saveToDataDirectory(filename) {
    var name = (filename || 'fit-user').trim() || 'fit-user';
    var csv = buildUserCsv();
    var fileName = name + '.csv';
    if (typeof showDirectoryPicker !== 'function') {
      return Promise.reject(new Error('当前浏览器不支持直接保存到目录，将改为下载文件。'));
    }
    function doWrite(dirHandle) {
      return writeCsvToDirHandle(dirHandle, fileName, csv).then(function() { return fileName; });
    }
    function ensurePermission(handle) {
      if (handle.queryPermission && handle.requestPermission) {
        return handle.queryPermission({ mode: 'readwrite' }).then(function(state) {
          if (state === 'granted') return handle;
          return handle.requestPermission({ mode: 'readwrite' }).then(function(s) { return s === 'granted' ? handle : Promise.reject(new Error('需要目录写入权限')); });
        });
      }
      return Promise.resolve(handle);
    }
    return getDataDirHandle()
      .then(function(handle) {
        if (handle) return ensurePermission(handle).then(doWrite);
        return Promise.reject(null);
      })
      .catch(function(e) {
        if (e !== null) return Promise.reject(e);
        return showDirectoryPicker({ mode: 'readwrite' })
          .then(function(dirHandle) {
            return saveDataDirHandle(dirHandle).then(function() { return doWrite(dirHandle); });
          });
      });
  }

  /**
   * 从 data 目录加载：用户选择 data 目录后保存该位置，再在该目录下选一个 CSV 文件加载。
   * @returns {Promise<void>} 加载并解析后写入当前用户数据
   */
  function loadFromDataDirectory() {
    if (typeof showDirectoryPicker !== 'function' || typeof showOpenFilePicker !== 'function') {
      return Promise.reject(new Error('当前浏览器不支持从目录选择文件。'));
    }
    return showDirectoryPicker({ mode: 'readwrite' })
      .then(function(dirHandle) {
        return saveDataDirHandle(dirHandle).then(function() { return dirHandle; });
      })
      .then(function(dirHandle) {
        return showOpenFilePicker({
          types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'], 'text/plain': ['.csv'] } }],
          multiple: false,
          startIn: dirHandle
        });
      })
      .then(function(handles) {
        if (!handles || !handles.length) return Promise.reject(new Error('未选择文件'));
        return handles[0].getFile();
      })
      .then(function(file) {
        return new Promise(function(res, rej) {
          var reader = new FileReader();
          reader.onload = function() { res(reader.result); };
          reader.onerror = function() { rej(reader.error); };
          reader.readAsText(file, 'UTF-8');
        });
      })
      .then(function(text) {
        loadFromFileContent(text);
      });
  }

  global.FitDataCsv = {
    buildUserCsv: buildUserCsv,
    parseUserCsv: parseUserCsv,
    downloadCsv: downloadCsv,
    loadFromFileContent: loadFromFileContent,
    saveToDataDirectory: saveToDataDirectory,
    loadFromDataDirectory: loadFromDataDirectory,
    saveDataDirHandle: saveDataDirHandle,
    getDataDirHandle: getDataDirHandle
  };
})(typeof window !== 'undefined' ? window : this);
