export function minutesLeftLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export function countdownLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const mins = Math.floor(diffMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatClockTime(date: Date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}