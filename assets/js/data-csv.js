/**
 * 个人信息 CSV：导出为文件下载，从本地文件加载。无需 server。
 */
(function(global) {
  var PROFILE_HEADER = '\u8EAB\u9AD8,\u4F53\u91CD,\u51FA\u751F\u65E5\u671F,\u6027\u522B,\u6D3B\u52A8\u91CF,\u663E\u793A\u540D';
  var WEIGHT_HEADER = '\u65E5\u671F,\u4F53\u91CD';

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

  global.FitDataCsv = {
    buildUserCsv: buildUserCsv,
    parseUserCsv: parseUserCsv,
    downloadCsv: downloadCsv,
    loadFromFileContent: loadFromFileContent
  };
})(typeof window !== 'undefined' ? window : this);
