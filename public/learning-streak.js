export function calendarDayKey(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function validDays(days) {
  return (Array.isArray(days) ? days : []).filter(day => {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    return calendarDayKey(new Date(`${day}T12:00:00`)) === day;
  });
}

export function learningStreak(days, now = new Date()) {
  const dates = new Set(validDays(days));
  const cursor = new Date(now);
  cursor.setHours(12,0,0,0);
  // Yesterday's series remains active until the user has all of today to practise.
  if (!dates.has(calendarDayKey(cursor))) cursor.setDate(cursor.getDate()-1);
  let count = 0;
  while (dates.has(calendarDayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate()-1);
  }
  return count;
}

export function addPracticeDay(stats, now = new Date()) {
  return {...stats, practiceDays:[...new Set([...validDays(stats.practiceDays),calendarDayKey(now)].filter(Boolean))].sort()};
}

export function recoverPracticeDays(stats, cards, now = new Date()) {
  const today = calendarDayKey(now);
  const dates = new Set(validDays(stats.practiceDays));
  // Recover only dated evidence of actual reviews, never creation or due dates.
  for (const card of cards) {
    const reviews = [...(Array.isArray(card.reviewLog) ? card.reviewLog.map(log=>log?.review) : []),card.lastReviewedAt];
    for (const review of reviews) {
      if (review == null || review === '') continue;
      const day = calendarDayKey(review);
      if (day && day <= today) dates.add(day);
    }
  }
  return {...stats,practiceDays:[...dates].sort()};
}
