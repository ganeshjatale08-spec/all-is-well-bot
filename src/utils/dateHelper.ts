export function toISTString(date: Date = new Date()): string {
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export function isWithinBusinessHours(date: Date = new Date()): boolean {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay(); // 0 Sun, 6 Sat
  const hour = ist.getHours();
  const isWeekday = day >= 1 && day <= 6; // Mon–Sat
  return isWeekday && hour >= 9 && hour < 20;
}
