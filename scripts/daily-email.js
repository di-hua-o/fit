// scripts/daily-email.js
// 使用 nodemailer 通过 SMTP 发送「今日饮食 + 锻炼 + 补剂」邮件

const nodemailer = require('nodemailer');

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const MEALS = [
  { name: '周日', lunch: '100g🍚米饭 + 🐟150g巴沙鱼（清煮鱼片，清淡汤底） + 🥬芦笋炒菠菜', dinner: '200g🍠红薯 + 🥩100g瘦牛肉（牛里脊，水煮牛肉片，清淡汤底）', nut: '15g🥜无盐原味开心果（复购适口款）' },
  { name: '周一', lunch: '100g🍚米饭 + 🍗2个去皮鸡腿（清煮，黑胡椒+盐） + 🥬清炒芦笋+油麦菜', dinner: '200g🍠紫薯 + 🍗150g去皮鸡胸肉（水煮，蘸生抽）', nut: '15g🥜杏仁' },
  { name: '周二', lunch: '100g🍚米饭 + 🥩100g瘦牛肉（牛里脊，少油煎牛柳） + 🥬香菇炒菠菜', dinner: '200g🥔土豆 + 🐟150g巴沙鱼（清蒸，生抽+葱花）', nut: '15g🥜巴旦木' },
  { name: '周三', lunch: '100g🍚米饭 + 🍗150g去皮鸡胸肉（少油快炒配香菇） + 🥬清炒生菜+芦笋', dinner: '200g🍠红薯 + 🍗2个去皮鸡腿（清蒸，姜片调味）', nut: '15g🥜无盐原味开心果' },
  { name: '周四', lunch: '100g🍚米饭 + 🐟150g龙利鱼（少油煎鱼块） + 🥬香菇炒油麦菜', dinner: '200g芋头 + 🥩100g瘦猪肉（猪里脊，清蒸肉片）', nut: '15g🥜原味腰果' },
  { name: '周五', lunch: '100g🍚米饭 + 🥩100g瘦猪肉（猪腱子，少油炒肉丝配菠菜） + 🥬清炒芦笋+生菜', dinner: '200g🍠紫薯 + 🥩100g瘦牛肉（牛腱子，清炖撇浮油，仅吃肉）', nut: '15g🥜原味核桃' },
  { name: '周六', lunch: '100g🍚米饭 + 🍗2个去皮鸡腿（清炖加姜片，不喝浓汤） + 🥬香菇+油麦菜清炒', dinner: '200g🥔土豆 + 🥚3个白煮蛋（少许生抽调味，纯蛋替代肉类）', nut: '15g🥜杏仁（复购经典款）' }
];

const COMMON = {
  breakfast: '60g🥣燕麦 + 2🥚白煮蛋 + 1小盒🥛无糖纯酸奶 + 半盒🫐蓝莓（加25g酵母蛋白粉）',
  beforeBed: '30g酵母蛋白粉 + 15g🥜低嘌呤坚果（每日轮换）',
  water: '每日≥4L，晨起空腹500ml温水'
};

const SUPPLEMENTS = [
  { name: '🐟 鱼油', dose: '2 粒', time: '早 1 粒、晚 1 粒' },
  { name: '💊 辅酶 Q10', dose: '2 粒', time: '早 1 粒、晚 1 粒' },
  { name: '🍊 维生素 C', dose: '约 1000mg（约 10 粒）', time: '全天分次' },
  { name: '💊 男士复合维生素', dose: '1 粒', time: '早上' },
  { name: '💊 甘氨酸镁', dose: '1 粒', time: '睡前' }
];

function buildPlan(offsetDays) {
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
  const meal = MEALS[weekday];

  let text = '';
  text += `日期：${year}年${month}月${day}日 ${weekdayName}\n\n`;
  text += '【饮食安排】\n';
  text += `早餐：${COMMON.breakfast}\n`;
  text += `午餐：${meal.lunch}\n`;
  text += `晚餐：${meal.dinner}\n`;
  text += `睡前加餐：${COMMON.beforeBed}（今日坚果：${meal.nut}）\n`;
  text += `饮水量：${COMMON.water}\n\n`;

  text += '【训练安排】\n';
  if (weekday === 0 || weekday === 6) {
    text += '有氧 + 无氧锻炼：每周两次（周末，详细计划待补充）\n\n';
  } else if (weekday === 2 || weekday === 4) {
    text += '有氧训练：30 分钟爬楼梯（周二/周四）\n\n';
  } else {
    text += '今天无固定训练安排，可按需轻度活动。\n\n';
  }

  text += '【补剂安排】\n';
  SUPPLEMENTS.forEach(s => {
    text += `${s.name}：${s.dose}，${s.time}\n`;
  });

  return { beijing, text };
}

async function main() {
  const offset = Number(process.env.PLAN_OFFSET_DAYS || '0'); // 0=今天，1=明天
  const label = process.env.PLAN_LABEL || (offset === 0 ? '今日' : '明日');
  const { beijing, text } = buildPlan(offset);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,         // e.g. smtp.163.com
    port: Number(process.env.SMTP_PORT), // e.g. 465
    secure: true,                        // 163 建议用 SSL 465
    auth: {
      user: process.env.SMTP_USER,       // 你的邮箱
      pass: process.env.SMTP_PASS        // 授权码
    }
  });

  const subject =
    `${label}饮食与锻炼安排 - ` +
    `${beijing.getFullYear()}-${String(beijing.getMonth() + 1).padStart(2, '0')}-${String(beijing.getDate()).padStart(2, '0')}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
    subject,
    text
  });

  console.log('Mail sent:\n', text);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

