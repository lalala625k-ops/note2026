/**
 * 智能日期与时间识别解析器
 * 支持：
 * - 月/日 (如 06/26, 6/26, 6-26, 6.26, 6月26日, 6 26) -> 缺省年默认补齐今年
 * - 年/月/日 (如 2026/06/26, 2025-06-26, 2026.6.26, 2026年6月26日, 26-06-26)
 * - 纯数字格式 (如 20260626, 0626)
 * - 相对日期 (如 今天, 明天, 后天, 大后天, 下周一~下周日, 周一~周日, 3天后)
 * - 时间后缀 (如 10:00, 14:30, 9点, 15点30分, 上午10点, 下午3点, 晚上8点)
 */

export interface ParsedDateResult {
  isValid: boolean;
  parsedDate: Date | null;
  formattedText: string;
  summaryText: string;
}

export function parseReminderDate(rawInput: string): ParsedDateResult {
  const input = rawInput.trim();
  if (!input) {
    return { isValid: false, parsedDate: null, formattedText: '', summaryText: '' };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  let targetYear = currentYear;
  let targetMonth = -1; // 0-11
  let targetDay = -1;
  let targetHour = 9; // 默认上午 9:00
  let targetMinute = 0;
  let hasSpecificTime = false;
  let matched = false;

  // 1. 提取时间部分 (如 14:30, 9:00, 10点半, 下午3点, 晚上8点)
  let datePart = input;

  // 匹配 14:30 或 14:30:00
  const timeColonMatch = datePart.match(/(?:(?:上午|下午|晚上|中午|早晨|清晨)\s*)?(\d{1,2}):(\d{1,2})(?::\d{1,2})?/);
  if (timeColonMatch) {
    let h = parseInt(timeColonMatch[1], 10);
    const m = parseInt(timeColonMatch[2], 10);
    if (/下午|晚上/.test(timeColonMatch[0]) && h < 12) h += 12;
    if (/中午/.test(timeColonMatch[0]) && h < 11) h += 12;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      targetHour = h;
      targetMinute = m;
      hasSpecificTime = true;
      datePart = datePart.replace(timeColonMatch[0], ' ').trim();
    }
  }

  // 匹配 10点, 10点半, 下午3点, 晚上8点45分
  const timeCnMatch = datePart.match(/(上午|下午|晚上|中午|早晨|清晨)?\s*(\d{1,2})\s*点(?:(\d{1,2}|半)分?)?/);
  if (timeCnMatch && !hasSpecificTime) {
    const period = timeCnMatch[1] || '';
    let h = parseInt(timeCnMatch[2], 10);
    let m = 0;
    if (timeCnMatch[3] === '半') m = 30;
    else if (timeCnMatch[3]) m = parseInt(timeCnMatch[3], 10);

    if ((period === '下午' || period === '晚上') && h < 12) h += 12;
    if (period === '中午' && h < 11) h += 12;

    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      targetHour = h;
      targetMinute = m;
      hasSpecificTime = true;
      datePart = datePart.replace(timeCnMatch[0], ' ').trim();
    }
  }

  // 2. 匹配相对日期
  if (/^今天/.test(datePart)) {
    targetMonth = now.getMonth();
    targetDay = now.getDate();
    matched = true;
  } else if (/^明天/.test(datePart)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    matched = true;
  } else if (/^后天/.test(datePart)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    matched = true;
  } else if (/^大后天/.test(datePart)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 3);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    matched = true;
  }

  // 3. 匹配 X天后 / X小时后 / X分钟后
  const daysLaterMatch = datePart.match(/^(\d+)\s*天后/);
  if (daysLaterMatch) {
    const delta = parseInt(daysLaterMatch[1], 10);
    const d = new Date(now);
    d.setDate(d.getDate() + delta);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    matched = true;
  }

  // 4. 匹配星期 (如 下周一, 周五, 星期天)
  const weekdayMap: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 0,
  };
  const weekMatch = datePart.match(/^(下周|周|星期)([一二三四五六日天1234567])/);
  if (weekMatch && !matched) {
    const isNextWeek = weekMatch[1] === '下周';
    const targetW = weekdayMap[weekMatch[2]];
    const currentW = now.getDay();
    let diff = (targetW - currentW + 7) % 7;
    if (diff === 0 && isNextWeek) diff = 7;
    if (isNextWeek && diff < 7) diff += 7;
    if (diff === 0 && !isNextWeek) diff = 7;

    const d = new Date(now);
    d.setDate(d.getDate() + diff);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    matched = true;
  }

  // 5. 匹配完整日期 YYYY-MM-DD 或 YYYY/MM/DD 或 YYYY年M月D日 或 YYYY.MM.DD 或 YYYY MM DD
  const ymdMatch = datePart.match(/^(\d{4})[-/.\s\u5e74](\d{1,2})[-/.\s\u6708](\d{1,2})\u65e5?$/);
  if (ymdMatch && !matched) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      targetYear = y;
      targetMonth = m - 1;
      targetDay = d;
      matched = true;
    }
  }

  // 匹配 YY-MM-DD 或 YY/MM/DD (如 26-06-26, 26/6/26)
  const y2mdMatch = datePart.match(/^(\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\u65e5?$/);
  if (y2mdMatch && !matched) {
    const y = 2000 + parseInt(y2mdMatch[1], 10);
    const m = parseInt(y2mdMatch[2], 10);
    const d = parseInt(y2mdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      targetYear = y;
      targetMonth = m - 1;
      targetDay = d;
      matched = true;
    }
  }

  // 匹配纯 8 位数字 YYYYMMDD (如 20260626)
  const ymdDigits = datePart.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymdDigits && !matched) {
    const y = parseInt(ymdDigits[1], 10);
    const m = parseInt(ymdDigits[2], 10);
    const d = parseInt(ymdDigits[3], 10);
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      targetYear = y;
      targetMonth = m - 1;
      targetDay = d;
      matched = true;
    }
  }

  // 6. 匹配月日 MM/DD 或 MM-DD 或 MM.DD 或 M月D日 / M月D 或 MM DD (如 06/26, 6/26, 6月26日, 6月26, 6 26)
  const mdMatch = datePart.match(/^(\d{1,2})[-/.\s\u6708](\d{1,2})\u65e5?$/);
  if (mdMatch && !matched) {
    const m = parseInt(mdMatch[1], 10);
    const d = parseInt(mdMatch[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      targetMonth = m - 1;
      targetDay = d;
      targetYear = currentYear;
      matched = true;
    }
  }

  // 匹配纯 4 位数字 MMDD (如 0626)
  const mdDigits = datePart.match(/^(\d{2})(\d{2})$/);
  if (mdDigits && !matched) {
    const m = parseInt(mdDigits[1], 10);
    const d = parseInt(mdDigits[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      targetMonth = m - 1;
      targetDay = d;
      targetYear = currentYear;
      matched = true;
    }
  }

  // 7. 仅输入了时间（如 10:00, 15:30）而没有输入日期
  if (hasSpecificTime && !matched && !datePart.trim()) {
    targetYear = now.getFullYear();
    targetMonth = now.getMonth();
    targetDay = now.getDate();
    if (targetHour < now.getHours() || (targetHour === now.getHours() && targetMinute < now.getMinutes())) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      targetYear = d.getFullYear();
      targetMonth = d.getMonth();
      targetDay = d.getDate();
    }
    matched = true;
  }

  if (!matched || targetMonth < 0 || targetDay < 0 || targetMonth > 11) {
    return { isValid: false, parsedDate: null, formattedText: '', summaryText: '' };
  }

  const finalDate = new Date(targetYear, targetMonth, targetDay, targetHour, targetMinute, 0);

  if (finalDate.getFullYear() !== targetYear || finalDate.getMonth() !== targetMonth || finalDate.getDate() !== targetDay) {
    return { isValid: false, parsedDate: null, formattedText: '', summaryText: '' };
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const yStr = finalDate.getFullYear();
  const mStr = pad(finalDate.getMonth() + 1);
  const dStr = pad(finalDate.getDate());
  const hStr = pad(finalDate.getHours());
  const minStr = pad(finalDate.getMinutes());

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekStr = weekdays[finalDate.getDay()];

  const formattedText = hasSpecificTime ? `${yStr}-${mStr}-${dStr} ${hStr}:${minStr}` : `${yStr}-${mStr}-${dStr}`;
  const summaryText = `${yStr}年${mStr}月${dStr}日 (${weekStr})${hasSpecificTime ? ` ${hStr}:${minStr}` : ''}`;

  return {
    isValid: true,
    parsedDate: finalDate,
    formattedText,
    summaryText,
  };
}

export function getNowFormatted(): { formattedText: string; summaryText: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yStr = now.getFullYear();
  const mStr = pad(now.getMonth() + 1);
  const dStr = pad(now.getDate());
  const hStr = pad(now.getHours());
  const minStr = pad(now.getMinutes());
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekStr = weekdays[now.getDay()];
  return {
    formattedText: `${yStr}-${mStr}-${dStr} ${hStr}:${minStr}`,
    summaryText: `此刻: ${yStr}年${mStr}月${dStr}日 (${weekStr}) ${hStr}:${minStr}`,
  };
}