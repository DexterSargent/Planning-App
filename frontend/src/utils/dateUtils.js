export function parseISODateLocal(value) {
  if (!value) return new Date();
  if (typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function formatDate(date) {
  const d = parseISODateLocal(date);
  return d.toISOString().slice(0, 10);
}

export function getOrdinal(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  if (day % 10 === 1) return 'st';
  if (day % 10 === 2) return 'nd';
  if (day % 10 === 3) return 'rd';
  return 'th';
}

export function formatDateFull(date) {
  const d = parseISODateLocal(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = d.getDate();
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${day}${getOrdinal(day)}, ${d.getFullYear()}`;
}

export function addDays(isoDate, days) {
  const d = parseISODateLocal(isoDate);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function startOfWeek(isoDate) {
  const d = parseISODateLocal(isoDate);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return formatDate(d);
}

export function monthRange(date) {
  const d = parseISODateLocal(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

export function getMonthGrid(date) {
  const d = parseISODateLocal(date);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const endDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  let current = 1 - startOffset;
  for (let i = 0; i < 35; i += 1) {
    const day = new Date(d.getFullYear(), d.getMonth(), current);
    cells.push({
      date: formatDate(day),
      active: day.getMonth() === d.getMonth(),
      label: day.getDate(),
      current: day.getMonth() === d.getMonth(),
    });
    current += 1;
  }
  return Array.from({ length: 5 }, (_, rowIndex) => cells.slice(rowIndex * 7, rowIndex * 7 + 7));
}

export function getWeekDays(date) {
  const start = parseISODateLocal(startOfWeek(formatDate(date)));
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return {
      date: formatDate(current),
      weekday: weekdayNames[index],
      label: current.getDate(),
    };
  });
}

export function getWeekdayIndex(date, weekStartDate) {
  const start = parseISODateLocal(weekStartDate);
  const current = parseISODateLocal(date);
  return Math.round((current - start) / (1000 * 60 * 60 * 24));
}

export function getWeekRange(date) {
  const start = startOfWeek(formatDate(date));
  return { start, end: addDays(start, 6) };
}

export function getMonthTitle(date) {
  const d = parseISODateLocal(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function getHourlyGrid() {
  return Array.from({ length: 24 }, (_, hour) => ({
    label: `${hour.toString().padStart(2, '0')}:00`,
    hour,
  }));
}

export function clampedMinutes(minutes) {
  return Math.max(0, Math.round(minutes));
}

export const CALENDAR_ROW_HEIGHT = 84;
