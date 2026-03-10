// scripts/daily-email.js
// 使用 nodemailer 通过 SMTP 发送「今日饮食 + 锻炼 + 补剂」邮件
// 支持给多个账户发送，并在正文中附带每个账户的基础数据（性别、年龄、身高、体重）。

const nodemailer = require('nodemailer');

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 大体重/高去脂体重（参考 all.md 原版）的模板
const HEAVY_COMMON = {
  breakfast:
    '60g🥣燕麦 + 2🥚白煮蛋 + 1小盒🥛无糖纯酸奶 + 半盒🫐蓝莓/少量🍓草莓/一小把🍒樱桃（三选一，总量≈50g，加25g酵母蛋白粉）',
  beforeBed: '30g酵母蛋白粉 + 15g🥜低嘌呤坚果（每日轮换）',
  water: '每日≥4L，晨起空腹500ml温水'
};

const HEAVY_WEEKDAY_MEALS = [
  // 1=周一 … 5=周五
  { // 周一
    lunch: '100g🍚米饭 + 🍗2个去皮鸡腿（清煮，黑胡椒+盐） + 🥬清炒芦笋+油麦菜',
    dinner: '200g🍠紫薯 + 🍗150g去皮鸡胸肉（水煮，蘸生抽）',
    nut: '15g🥜杏仁'
  },
  { // 周二
    lunch: '100g🍚米饭 + 🥩100g瘦牛肉（牛里脊，少油煎牛柳） + 🥬香菇炒菠菜',
    dinner: '200g🥔土豆 + 🐟150g巴沙鱼（清蒸，生抽+葱花）',
    nut: '15g🥜巴旦木'
  },
  { // 周三
    lunch: '100g🍚米饭 + 🍗150g去皮鸡胸肉（少油快炒配香菇） + 🥬清炒生菜+芦笋',
    dinner: '200g🍠红薯 + 🍗2个去皮鸡腿（清蒸，姜片调味）',
    nut: '15g🥜无盐原味开心果'
  },
  { // 周四
    lunch: '100g🍚米饭 + 🐟150g龙利鱼（少油煎鱼块） + 🥬香菇炒油麦菜',
    dinner: '200g芋头 + 🥩100g瘦猪肉（猪里脊，清蒸肉片）',
    nut: '15g🥜原味腰果'
  },
  { // 周五
    lunch: '100g🍚米饭 + 🥩100g瘦猪肉（猪腱子，少油炒肉丝配菠菜） + 🥬清炒芦笋+生菜',
    dinner: '200g🍠紫薯 + 🥩100g瘦牛肉（牛腱子，清炖撇浮油，仅吃肉）',
    nut: '15g🥜原味核桃'
  }
];

const HEAVY_TRAINING_WEEKEND = {
  // 周六
  6: {
    breakfast:
      '70g🥣燕麦 + 2🥚白煮蛋 + 1小盒🥛无糖纯酸奶 + 半盒🫐蓝莓/少量🍓草莓/一小把🍒樱桃（三选一，总量≈50g，加25g酵母蛋白粉）',
    lunch: '120g🍚生米煮饭 + 🍗2个去皮鸡腿（清炖加姜片，不喝浓汤） + 🥬香菇+油麦菜清炒',
    dinner:
      '练后餐：100g🍚生米煮饭 + 150g🥩瘦肉（牛肉/猪肉任选，清淡烹饪）；晚餐：250g🍠紫薯 + 🥩100g瘦牛肉（牛腱子，清炖撇浮油，仅吃肉）',
    beforeBed: '30g酵母蛋白粉 + 1根🍌香蕉（其余坚果可按需酌情减少或省略）'
  },
  // 周日
  0: {
    breakfast: '70g🥣燕麦 + 30g🥄蛋白粉 + 1个🥚全蛋 + 2个🥚蛋清',
    lunch: '练前餐：100g🍚生米煮饭 + 2个🍗去皮鸡腿',
    dinner:
      '练后餐：1根🍌香蕉 + 120g🍚生米煮饭 + 2个🍗去皮鸡腿；第四餐：300g🍜熟面条 + 150g🥩炒瘦肉',
    beforeBed: '1个馒头 + 1个🍗去皮鸡腿'
  }
};

// 轻量版（参考 wfz.md 为 57kg、体脂 30% 设计）
const LIGHT_COMMON = {
  breakfast:
    '35g🥣燕麦 + 1🥚白煮全蛋 + 1小盒🥛无糖纯酸奶 + 少量🫐蓝莓/🍓草莓/🍒樱桃（总量40–50g，加15g酵母蛋白粉）',
  beforeBed: '20g酵母蛋白粉 + 10g🥜低嘌呤坚果',
  water: '每日≥2.5–3L，晨起空腹300–500ml温水'
};

const LIGHT_WEEKDAY_MEALS = [
  { // 周一
    lunch: '60g🍚生米煮饭 + 1个🍗去皮鸡腿（清煮或清蒸） + 🥬清炒芦笋+生菜',
    dinner: '120g🍠紫薯 + 80g🍗去皮鸡胸肉（水煮，蘸少量生抽+黑胡椒）',
    nut: '10g🥜杏仁'
  },
  { // 周二
    lunch: '60g🍚生米煮饭 + 70–80g🥩瘦牛肉（牛里脊，少油煎牛柳） + 🥬香菇炒菠菜',
    dinner: '120g🥔土豆（蒸/煮） + 2个🥚白煮蛋（1全蛋+1蛋清）',
    nut: '10g🥜巴旦木'
  },
  { // 周三
    lunch: '60g🍚生米煮饭 + 80–90g🍗去皮鸡胸肉（少油快炒配香菇） + 🥬清炒油麦菜',
    dinner: '120g🍠红薯 + 100g🐟巴沙鱼（清蒸，生抽+葱花）',
    nut: '10g🥜无盐原味开心果'
  },
  { // 周四
    lunch: '60g🍚生米煮饭 + 100g🐟龙利鱼（少油煎鱼块） + 🥬香菇炒油麦菜',
    dinner: '120g芋头 + 70–80g🥩瘦猪肉（清蒸肉片或少油快炒）',
    nut: '10g🥜原味腰果'
  },
  { // 周五
    lunch: '60g🍚生米煮饭 + 70–80g🥩瘦猪肉（配菠菜少油炒） + 🥬清炒生菜',
    dinner: '120g🍠紫薯 + 70–80g🥩瘦牛肉（清炖撇浮油，仅吃肉）',
    nut: '10g🥜原味核桃'
  }
];

const LIGHT_TRAINING_WEEKEND = {
  6: {
    breakfast:
      '40g🥣燕麦 + 1🥚白煮全蛋 + 1小盒🥛无糖纯酸奶 + 少量混合浆果（约40–50g，加15g酵母蛋白粉）',
    lunch: '70g🍚生米煮饭 + 1个🍗去皮鸡腿 + 🥬香菇+生菜清炒',
    dinner: '140g🍠紫薯 + 80g🥩瘦牛肉（清炖撇浮油，仅吃肉）',
    beforeBed: '20g酵母蛋白粉（如当天总蛋白已足，可不额外加坚果）'
  },
  0: {
    breakfast: '40g🥣燕麦 + 1个🥚全蛋 + 1个🥚蛋清 + 15g酵母蛋白粉',
    lunch: '70g🍚生米煮饭 + 80–90g🥩瘦肉（牛肉/猪肉任选） + 大量蔬菜',
    dinner: '120g根茎类 + 2个🥚白煮蛋 或 70–80g🥩瘦肉/鱼肉 + 蔬菜',
    beforeBed: '20g酵母蛋白粉'
  }
};

const SUPPLEMENTS = [
  { name: '🐟 鱼油', dose: '1–2 粒', time: '早 1 粒、晚 0–1 粒' },
  { name: '💊 辅酶 Q10', dose: '1–2 粒', time: '早 1 粒、晚 0–1 粒' },
  { name: '🍊 维生素 C', dose: '500–1000mg（5–10 粒）', time: '中午/晚上分次服用' },
  { name: '💊 复合维生素', dose: '1 粒', time: '早上' },
  { name: '💊 甘氨酸镁', dose: '1 粒', time: '睡前' }
];

function choosePlanByAccount(acc) {
  const weight = typeof acc.weight === 'number' ? acc.weight : Number(acc.weight || 0);
  const bodyFat = typeof acc.bodyFat === 'number' ? acc.bodyFat : Number(acc.bodyFat || 0.3);
  const lbm = weight * (1 - bodyFat); // 去脂体重
  const trainWeekend = acc.trainWeekend === 1 || acc.trainWeekend === '1';

  // 阈值参考：原版 112kg、体脂 35% → LBM ≈ 72.8kg，这里 60kg 作为切分
  if (lbm >= 60) {
    return {
      type: 'heavy',
      common: HEAVY_COMMON,
      weekdayMeals: HEAVY_WEEKDAY_MEALS,
      weekendTrainingMeals: HEAVY_TRAINING_WEEKEND,
      lbm,
      trainWeekend
    };
  }

  return {
    type: 'light',
    common: LIGHT_COMMON,
    weekdayMeals: LIGHT_WEEKDAY_MEALS,
    weekendTrainingMeals: LIGHT_TRAINING_WEEKEND,
    lbm,
    trainWeekend
  };
}

function buildPlanForAccount(acc, offsetDays) {
  const now = new Date();
  // GitHub Actions 为 UTC，这里先转成北京时间（UTC+8），再按 offsetDays 推进
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const beijing = new Date(
    beijingNow.getFullYear(),
    beijingNow.getMonth(),
    beijingNow.getDate() + offsetDays
  );

  const year = beijing.getFullYear();
  const month = beijing.getMonth() + 1;
  const day = beijing.getDate();
  const weekday = beijing.getDay(); // 0=周日 ... 6=周六

  const weekdayName = WEEKDAY_NAMES[weekday];

  const plan = choosePlanByAccount(acc);
  const { common, weekdayMeals, weekendTrainingMeals, lbm, trainWeekend } = plan;

  let breakfast = common.breakfast;
  let beforeBed = common.beforeBed;

  // 选择午/晚餐：工作日用 weekdayMeals，周末根据 trainWeekend 决定
  let lunch = '';
  let dinner = '';
  let nut = '';

  if (weekday >= 1 && weekday <= 5) {
    const m = weekdayMeals[weekday - 1];
    lunch = m.lunch;
    dinner = m.dinner;
    nut = m.nut;
  } else if ((weekday === 0 || weekday === 6) && trainWeekend) {
    // 周末且选择锻炼 → 训练日专用食谱
    const m = weekendTrainingMeals[weekday];
    breakfast = m.breakfast || breakfast;
    beforeBed = m.beforeBed || beforeBed;
    lunch = m.lunch;
    dinner = m.dinner;
  } else {
    // 周末但不做无氧 → 按「普通工作日」吃，这里统一用周三模板
    const m = weekdayMeals[2]; // index=2 → 周三
    lunch = m.lunch;
    dinner = m.dinner;
    nut = m.nut;
  }

  // 早中晚补剂简要描述（简化为通用版）
  const morningSupp = '鱼油 1 粒、辅酶 Q10 1 粒、复合维生素 1 粒';
  const noonSupp = '维生素 C 若干（约 3–5 粒）';
  const eveningSupp = '鱼油 0–1 粒、辅酶 Q10 0–1 粒、甘氨酸镁 1 粒、维生素 C 若干';

  let lines = [];
  lines.push(`日期：${year}年${month}月${day}日 ${weekdayName}`);
  lines.push('');
  lines.push(`早：${breakfast}；补剂：${morningSupp}`);
  lines.push(`中：${lunch}；补剂：${noonSupp}`);
  lines.push(`晚：${dinner}；补剂：${eveningSupp}`);
  lines.push('');

  // 简要补充饮水与训练
  lines.push(`睡前加餐：${beforeBed}${nut ? `（坚果：${nut}）` : ''}`);
  lines.push(`饮水：${common.water}`);

  if (weekday === 6 || weekday === 0) {
    if (trainWeekend) {
      lines.push('训练：周末计划为「有无氧训练日」，请按胸/背/肩或腿/臀训练 + 有氧 30–40 分钟执行。');
    } else {
      lines.push('训练：本周末标记为不做无氧，可安排轻度散步、拉伸、家务等活动即可。');
    }
  } else if (weekday === 2 || weekday === 4) {
    lines.push('训练：建议今日安排 30 分钟爬楼梯/快走等中等强度有氧。');
  } else {
    lines.push('训练：无刚性要求，可视状态灵活安排轻度活动或休息。');
  }

  // 补充宏观营养目标（按去脂体重估算）
  const kcal = Math.round(lbm * 24);
  const protein = Math.round(lbm * 2);
  const carb = Math.round(lbm * 2.2);
  const fat = Math.round(lbm * 0.6);

  lines.push('');
  lines.push('——— 当日宏观营养目标（估算）——');
  lines.push(`去脂体重：约 ${lbm.toFixed(1)} kg（按体重×(1-体脂率)估算）`);
  lines.push(`热量：≈ ${kcal} kcal`);
  lines.push(`蛋白质：≈ ${protein} g`);
  lines.push(`碳水：≈ ${carb} g`);
  lines.push(`脂肪：≈ ${fat} g`);

  const text = lines.join('\n');
  return { beijing, text };
}

async function main() {
  const offset = Number(process.env.PLAN_OFFSET_DAYS || '0'); // 0=今天，1=明天
  const label = process.env.PLAN_LABEL || (offset === 0 ? '今日' : '明日');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,         // e.g. smtp.163.com
    port: Number(process.env.SMTP_PORT), // e.g. 465
    secure: true,                        // 163 建议用 SSL 465
    auth: {
      user: process.env.SMTP_USER,       // 你的邮箱
      pass: process.env.SMTP_PASS        // 授权码
    }
  });

  let beijingForSubject = null;

  // 优先从仓库中的 accounts.json 读取多账户配置，若不存在则退回到 MAIL_TO。
  let accounts = [];
  try {
    const fs = require('fs');
    const path = require('path');
    const accountsPath = process.env.ACCOUNTS_FILE || path.join(__dirname, 'accounts.json');
    if (fs.existsSync(accountsPath)) {
      const raw = fs.readFileSync(accountsPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        accounts = parsed.filter(a => a && a.email);
      }
    }
  } catch (e) {
    console.error('Failed to load accounts.json:', e);
  }

  if (accounts.length === 0 && process.env.MAIL_TO) {
    accounts = [{ email: process.env.MAIL_TO }];
  }

  if (accounts.length === 0) {
    console.error('No recipients configured (accounts.json / MAIL_TO).');
    process.exit(1);
  }

  for (const acc of accounts) {
    const { beijing, text } = buildPlanForAccount(acc, offset);

    if (!beijingForSubject) {
      beijingForSubject = beijing;
    }

    const gender = acc.gender || '';
    const age = acc.age != null ? String(acc.age) : '';
    const weight = acc.weight != null ? String(acc.weight) : '';
    const height = acc.height != null ? String(acc.height) : '';
    const bodyFat =
      acc.bodyFat != null
        ? typeof acc.bodyFat === 'number'
          ? (acc.bodyFat * 100).toFixed(1)
          : String(Number(acc.bodyFat) * 100)
        : '';
    const trainWeekend = acc.trainWeekend === 1 || acc.trainWeekend === '1';

    const plan = choosePlanByAccount(acc);

    let personalLines = [];
    if (gender || age || weight || height || bodyFat) {
      personalLines.push('');
      personalLines.push('——— 个人基础数据 ——');
      if (gender) personalLines.push(`性别：${gender}`);
      if (age) personalLines.push(`年龄：${age} 岁`);
      if (height) personalLines.push(`身高：${height} cm`);
      if (weight) personalLines.push(`体重：${weight} kg`);
      if (bodyFat) personalLines.push(`体脂率：约 ${bodyFat}%`);
      personalLines.push(
        `周末无氧训练：${trainWeekend ? '是（按训练日食谱）' : '否（按工作日食谱）'}；当前食谱版本：${
          plan.type === 'heavy' ? '高体重版' : '轻量版'
        }`
      );
    }

    const subjectBase =
      `${label}饮食与锻炼安排 - ` +
      `${beijing.getFullYear()}-${String(beijing.getMonth() + 1).padStart(2, '0')}-${String(
        beijing.getDate()
      ).padStart(2, '0')}`;

    const mailText = text + (personalLines.length ? '\n' + personalLines.join('\n') : '');

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: acc.email,
      subject: subjectBase,
      text: mailText
    });

    console.log(`Mail sent to ${acc.email}:\n`, mailText);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

