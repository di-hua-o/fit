/**
 * 多用户：当前用户与 per-user 数据切换。
 * 体重、热量等页统一读 localStorage 的「当前用户」数据；本脚本在「我的信息」页切换/保存用户时写入。
 */
(function(global) {
  var KEY_USER_LIST = 'fit-user-list';
  var KEY_CURRENT = 'fit-current-username';
  var KEY_USERDATA_PREFIX = 'fit-userdata-';

  var USER_DATA_KEYS = [
    'fit-username',
    'fit-height-cm',
    'fit-weight-records',
    'fit-weight-seeded',
    'fit-calorie-weight-override',
    'fit-calorie-birthdate',
    'fit-calorie-age',
    'fit-calorie-gender',
    'fit-calorie-activity'
  ];

  function getUserList() {
    try {
      var raw = localStorage.getItem(KEY_USER_LIST);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function getCurrentUsername() {
    return localStorage.getItem(KEY_CURRENT) || '';
  }

  function setCurrentUsername(name) {
    if (name != null) localStorage.setItem(KEY_CURRENT, String(name));
  }

  function gatherWorkingData() {
    var out = {};
    USER_DATA_KEYS.forEach(function(key) {
      var v = localStorage.getItem(key);
      if (v != null) out[key] = v;
    });
    return out;
  }

  function clearWorkingData() {
    USER_DATA_KEYS.forEach(function(key) { localStorage.removeItem(key); });
  }

  function applyWorkingData(obj) {
    if (!obj || typeof obj !== 'object') return;
    USER_DATA_KEYS.forEach(function(key) {
      if (obj[key] != null) localStorage.setItem(key, String(obj[key]));
    });
  }

  function saveWorkingToCurrentUser() {
    var current = getCurrentUsername();
    if (!current) return;
    var list = getUserList();
    if (list.indexOf(current) === -1) {
      list.push(current);
      localStorage.setItem(KEY_USER_LIST, JSON.stringify(list));
    }
    var data = gatherWorkingData();
    localStorage.setItem(KEY_USERDATA_PREFIX + current, JSON.stringify(data));
  }

  function loadUserIntoWorking(username) {
    if (!username) {
      clearWorkingData();
      return;
    }
    var raw = localStorage.getItem(KEY_USERDATA_PREFIX + username);
    var obj;
    try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }
    clearWorkingData();
    applyWorkingData(obj);
    setCurrentUsername(username);
  }

  function ensureCurrentUser() {
    var list = getUserList();
    var current = getCurrentUsername();
    if (current && list.indexOf(current) !== -1) {
      loadUserIntoWorking(current);
      return;
    }
    if (list.length > 0) {
      loadUserIntoWorking(list[0]);
      return;
    }
    var legacyName = (localStorage.getItem('fit-username') || '').trim();
    if (legacyName) {
      list = [legacyName];
      localStorage.setItem(KEY_USER_LIST, JSON.stringify(list));
      saveWorkingToCurrentUser();
      setCurrentUsername(legacyName);
      return;
    }
    var defaultName = '默认用户';
    list = [defaultName];
    localStorage.setItem(KEY_USER_LIST, JSON.stringify(list));
    setCurrentUsername(defaultName);
    clearWorkingData();
    localStorage.setItem('fit-username', defaultName);
    localStorage.setItem(KEY_USERDATA_PREFIX + defaultName, JSON.stringify(gatherWorkingData()));
  }

  function addUser(name) {
    var n = (name || '').trim();
    if (!n) return false;
    var list = getUserList();
    if (list.indexOf(n) !== -1) return false;
    list.push(n);
    localStorage.setItem(KEY_USER_LIST, JSON.stringify(list));
    return true;
  }

  global.FitUser = {
    USER_DATA_KEYS: USER_DATA_KEYS,
    getCurrentUsername: getCurrentUsername,
    getUserList: getUserList,
    loadUserIntoWorking: loadUserIntoWorking,
    saveWorkingToCurrentUser: saveWorkingToCurrentUser,
    ensureCurrentUser: ensureCurrentUser,
    gatherWorkingData: gatherWorkingData,
    addUser: addUser,
    setCurrentUsername: setCurrentUsername
  };
})(typeof window !== 'undefined' ? window : this);
