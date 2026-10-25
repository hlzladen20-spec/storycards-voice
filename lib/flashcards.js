import { fsrs, createEmptyCard, Rating } from './fsrs.mjs';
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false });
export function normaliseCards(cards) {
  if (!Array.isArray(cards)) return [];

  const seen = new Set();
  return cards
    .filter((card) => card && typeof card.front === "string" && typeof card.back === "string")
    .map((card) => ({
      ...card,
      id: card.id || crypto.randomUUID(),
      front: card.front.trim(),
      back: card.back.trim(),
      note: typeof card.note === "string" ? card.note.trim() : "",
      source: "conversation",
      attempts: Number(card.attempts) || 0,
      misses: Number(card.misses) || 0,
      knownStreak: Number(card.knownStreak) || 0,
      nextReviewAt: Number(card.nextReviewAt) || Date.now()
    }))
    .filter((card) => card.front && card.back && !seen.has(card.front.toLowerCase()) && seen.add(card.front.toLowerCase()))
    .slice(0, 15);
}

export function prioritiseCards(cards, now = Date.now()) {
  return [...cards].sort((a, b) => Number(b.nextReviewAt <= now) - Number(a.nextReviewAt <= now) || Number(Boolean(b.attempts)) - Number(Boolean(a.attempts)) || a.nextReviewAt - b.nextReviewAt);
}

export function rateCard(card, rating, now = Date.now()) {
  const attempts = (card.attempts || 0) + 1;
  const grade = { no: Rating.Again, hard: Rating.Hard, yes: Rating.Good }[rating];
  if (!grade) throw new Error('Unknown review rating');
  const previous = card.fsrs || createEmptyCard(new Date(now));
  const result = scheduler.next(previous, new Date(now), grade);
  return { ...card, attempts, misses: (card.misses || 0) + Number(rating === 'no'), knownStreak: rating === 'yes' ? (card.knownStreak || 0) + 1 : 0, fsrs: result.card, nextReviewAt: result.card.due.getTime(), reviewLog: [...(card.reviewLog || []), result.log] };
}
