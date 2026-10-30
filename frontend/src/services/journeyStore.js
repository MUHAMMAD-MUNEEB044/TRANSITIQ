// Client-side journey log — records when a passenger spends 2+ minutes on a
// live tracking page. Stored in localStorage so it works in every DB mode.
const KEY = 'transitiq_journeys';
const MAX_ENTRIES = 100;

export const addJourneyEntry = (entry) => {
  try {
    const journeys = JSON.parse(localStorage.getItem(KEY) || '[]');
    journeys.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      ...entry,
    });
    localStorage.setItem(KEY, JSON.stringify(journeys.slice(0, MAX_ENTRIES)));
  } catch {
    // storage full/unavailable — non-critical
  }
};

export const getJourneys = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const clearJourneys = () => localStorage.removeItem(KEY);

export const formatDuration = (sec) => {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
