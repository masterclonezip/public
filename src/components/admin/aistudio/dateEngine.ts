import { DateDistributionMode, StudioConfig } from './types';

const INDIAN_FIRST_NAMES = [
  'Rahul', 'Rohit', 'Amit', 'Vikas', 'Deepak', 'Sanjay', 'Pooja', 'Sunil',
  'Ankit', 'Manish', 'Kunal', 'Rohan', 'Neeraj', 'Arjun', 'Priya', 'Kavita',
  'Sameer', 'Naveen', 'Gaurav', 'Aditya', 'Ravi', 'Manoj', 'Sachin', 'Pawan',
  'Harsh', 'Vikram', 'Rajesh', 'Suresh', 'Abhishek', 'Akash', 'Suraj', 'Ajay'
];

const INDIAN_LAST_INITIALS_OR_NAMES = [
  'Sharma', 'Verma', 'Kumar', 'Singh', 'Patel', 'Yadav', 'Gupta', 'Mehta',
  'Joshi', 'Chauhan', 'Rawat', 'Pandey', 'Malhotra', 'Reddy', 'Mishra', 'Tiwari',
  'K.', 'S.', 'R.', 'P.', 'V.', 'M.', 'B.', 'G.', 'D.', 'A.'
];

export function generateRealisticUserName(): string {
  const first = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)];
  const last = INDIAN_LAST_INITIALS_OR_NAMES[Math.floor(Math.random() * INDIAN_LAST_INITIALS_OR_NAMES.length)];
  return `${first} ${last}`;
}

export function getDefaultStartDate(): string {
  const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function getDefaultEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatReviewDatePreview(isoStr?: string): string {
  if (!isoStr) return 'Just now';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return String(isoStr);
  }
}

export function generateReviewTimestamp(
  config: StudioConfig,
  indexInBatch: number,
  totalInBatch: number,
  previousIso?: string
): string {
  const now = Date.now();
  let windowMs = 7 * 24 * 60 * 60 * 1000;

  if (config.dateRangeMode === 'custom_days') {
    windowMs = Math.max(1, config.customDays || 14) * 24 * 60 * 60 * 1000;
  } else if (config.dateRangeMode === 'custom_months') {
    windowMs = Math.max(1, config.customMonths || 2) * 30 * 24 * 60 * 60 * 1000;
  } else if (config.dateRangeMode === 'specific_range' && config.startDate && config.endDate) {
    const startMs = new Date(config.startDate).getTime();
    const endMs = Math.min(now, new Date(config.endDate).getTime() + 23 * 3600 * 1000);
    if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
      const slotSpan = (endMs - startMs) / Math.max(1, totalInBatch);
      const base = endMs - indexInBatch * slotSpan - Math.random() * slotSpan * 0.85;
      const d = new Date(Math.max(startMs, Math.min(now - 60000, base)));
      return d.toISOString();
    }
  }

  const startMs = now - windowMs;
  const slotSpan = windowMs / Math.max(1, totalInBatch);
  let targetMs = now - indexInBatch * slotSpan - Math.random() * slotSpan * 0.85;

  if (previousIso) {
    const prevMs = new Date(previousIso).getTime();
    if (!isNaN(prevMs) && Math.abs(targetMs - prevMs) < 12 * 60 * 1000) {
      targetMs -= (15 + Math.floor(Math.random() * 90)) * 60 * 1000;
    }
  }

  const finalDate = new Date(Math.max(startMs, Math.min(now - 120000, targetMs)));
  // Keep realistic active Indian mobile hours (07:30 to 23:45)
  const hr = finalDate.getHours();
  if (hr >= 1 && hr <= 6) {
    finalDate.setHours(8 + Math.floor(Math.random() * 14));
  }
  return finalDate.toISOString();
}

export interface GeneratedDateResult {
  isoTimestamp: string;
  dateTag: 'Today' | 'Yesterday' | '2 Days Ago' | '3 Days Ago' | 'Custom';
  formattedDisplay: string;
}

export function generateRealisticTimestamp(
  mode: DateDistributionMode,
  indexInBatch: number,
  _totalInBatch: number
): GeneratedDateResult {
  const now = new Date();
  let targetDate = new Date(now.getTime());
  let dateTag: 'Today' | 'Yesterday' | '2 Days Ago' | '3 Days Ago' | 'Custom' = 'Today';

  let isMorningOnly = false;
  let isEveningOnly = false;

  if (mode === 'today_only') {
    dateTag = 'Today';
  } else if (mode === 'today_morning') {
    dateTag = 'Today';
    isMorningOnly = true;
  } else if (mode === 'today_evening') {
    dateTag = 'Today';
    isEveningOnly = true;
  } else if (mode === 'yesterday_only') {
    targetDate.setDate(now.getDate() - 1);
    dateTag = 'Yesterday';
  } else if (mode === 'today_and_yesterday' || mode === 'last_2_days') {
    const isYesterday = indexInBatch % 2 === 1;
    if (isYesterday) {
      targetDate.setDate(now.getDate() - 1);
      dateTag = 'Yesterday';
    } else {
      dateTag = 'Today';
    }
  } else if (mode === 'last_3_days') {
    const dayOffset = indexInBatch % 3;
    targetDate.setDate(now.getDate() - dayOffset);
    if (dayOffset === 0) dateTag = 'Today';
    else if (dayOffset === 1) dateTag = 'Yesterday';
    else dateTag = '2 Days Ago';
  } else if (mode === 'last_5_days') {
    const dayOffset = indexInBatch % 5;
    targetDate.setDate(now.getDate() - dayOffset);
    if (dayOffset === 0) dateTag = 'Today';
    else if (dayOffset === 1) dateTag = 'Yesterday';
    else if (dayOffset === 2) dateTag = '2 Days Ago';
    else if (dayOffset === 3) dateTag = '3 Days Ago';
    else dateTag = 'Custom';
  } else if (mode === 'last_7_days') {
    const dayOffset = indexInBatch % 7;
    targetDate.setDate(now.getDate() - dayOffset);
    if (dayOffset === 0) dateTag = 'Today';
    else if (dayOffset === 1) dateTag = 'Yesterday';
    else if (dayOffset === 2) dateTag = '2 Days Ago';
    else if (dayOffset === 3) dateTag = '3 Days Ago';
    else dateTag = 'Custom';
  } else if (mode === 'last_15_days') {
    const dayOffset = Math.floor(Math.random() * 15);
    targetDate.setDate(now.getDate() - dayOffset);
    dateTag = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Yesterday' : 'Custom';
  } else if (mode === 'last_30_days') {
    const dayOffset = Math.floor(Math.random() * 30);
    targetDate.setDate(now.getDate() - dayOffset);
    dateTag = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Yesterday' : 'Custom';
  }

  let minHour = 8;
  let maxHour = dateTag === 'Today' ? Math.max(9, now.getHours()) : 23;

  if (isMorningOnly) {
    minHour = 8;
    maxHour = dateTag === 'Today' ? Math.min(13, Math.max(9, now.getHours())) : 13;
  } else if (isEveningOnly) {
    minHour = dateTag === 'Today' && now.getHours() < 17 ? 8 : 17;
    maxHour = dateTag === 'Today' ? Math.max(minHour, now.getHours()) : 23;
  }

  if (maxHour < minHour) maxHour = minHour;

  const randomHour = minHour + Math.floor(Math.random() * (maxHour - minHour + 1));
  const randomMinute = Math.floor(Math.random() * 60);
  const randomSecond = Math.floor(Math.random() * 60);

  targetDate.setHours(randomHour, randomMinute, randomSecond, 0);

  if (targetDate.getTime() > now.getTime()) {
    targetDate = new Date(now.getTime() - (Math.floor(Math.random() * 45) + 10) * 60000);
  }

  const hoursDisplay = targetDate.getHours() % 12 || 12;
  const ampm = targetDate.getHours() >= 12 ? 'PM' : 'AM';
  const minutesDisplay = String(targetDate.getMinutes()).padStart(2, '0');
  const formattedDisplay = `${dateTag}, ${hoursDisplay}:${minutesDisplay} ${ampm}`;

  return {
    isoTimestamp: targetDate.toISOString(),
    dateTag,
    formattedDisplay
  };
}
