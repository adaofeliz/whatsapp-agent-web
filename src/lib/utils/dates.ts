import { formatDistanceToNow, format } from 'date-fns';

export function fromUnix(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

export function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function formatRelative(timestamp: number): string {
  const date = fromUnix(timestamp);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatTime(timestamp: number): string {
  const date = fromUnix(timestamp);
  return format(date, 'HH:mm');
}

export function formatDate(timestamp: number): string {
  const date = fromUnix(timestamp);
  return format(date, 'yyyy-MM-dd');
}

export function formatDateTime(timestamp: number): string {
  const date = fromUnix(timestamp);
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDateTimeFull(timestamp: number): string {
  const date = fromUnix(timestamp);
  return format(date, 'PPpp');
}

export function isToday(timestamp: number): boolean {
  const date = fromUnix(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isYesterday(timestamp: number): boolean {
  const date = fromUnix(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

export function getDaysBetween(startTs: number, endTs: number): number {
  const start = fromUnix(startTs);
  const end = fromUnix(endTs);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
