// scripts/update-weights-from-mail.js
// 从 IMAP 邮箱读取邮件，解析类似「今日体重：83.5kg」的内容，更新 scripts/accounts.json 中对应邮箱的体重字段。

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');

const ACCOUNTS_PATH = process.env.ACCOUNTS_FILE || path.join(__dirname, 'accounts.json');

async function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_PATH)) return [];
  const raw = fs.readFileSync(ACCOUNTS_PATH, 'utf8');
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2) + '\n', 'utf8');
}

function normalizeEmail(addr) {
  if (!addr) return '';
  const m = addr.match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim().toLowerCase();
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseWeightFromText(text) {
  if (!text) return null;
  const re = /(今日)?\s*体重\s*[:：]\s*([\d\.]+)\s*kg?/i;
  const m = text.match(re);
  if (!m) return null;
  const v = parseFloat(m[2]);
  if (!isFinite(v) || v <= 0 || v > 500) return null;
  return v;
}

async function main() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS
    }
  });

  console.log('Connecting to IMAP...');
  await client.connect();
  await client.mailboxOpen('INBOX');

  // 只处理最近 7 天的未读邮件，且只处理发件人在 accounts 中的邮件（避免扫整箱历史未读）
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lock = await client.getMailboxLock('INBOX');
  let accounts = await loadAccounts();
  const accountEmails = new Set(accounts.map(a => normalizeEmail(a.email)));
  let changed = false;
  try {
    for await (let msg of client.fetch({ seen: false, since }, { envelope: true, source: true })) {
      const fromAddr = msg.envelope.from && msg.envelope.from[0] && msg.envelope.from[0].address;
      const email = normalizeEmail(fromAddr);
      if (!email) continue;
      if (!accountEmails.has(email)) continue; // 发件人不在名单内，不解析正文也不打 log

      const parsed = await simpleParser(msg.source);
      const textPart = (parsed.text || '').trim();
      const htmlPart = stripHtml(parsed.html || '');
      const body = textPart || htmlPart;
      const w = parseWeightFromText(body);
      if (w == null) {
        console.log(`Skip mail from ${email}: no weight found.`);
        continue;
      }

      const idx = accounts.findIndex(a => normalizeEmail(a.email) === email);
      if (idx === -1) continue;

      console.log(`Update weight for ${email}: ${w} kg`);
      accounts[idx].weight = w;
      changed = true;
      await client.messageFlagsAdd(msg.uid, ['\\Seen']);
    }
  } finally {
    lock.release();
  }

  await client.logout();

  if (changed) {
    saveAccounts(accounts);
    console.log('accounts.json updated.');
  } else {
    console.log('No weight updates.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

