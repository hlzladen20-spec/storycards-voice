export function normaliseCards(cards) {
  if (!Array.isArray(cards)) return [];

  const seen = new Set();
  return cards
    .filter((card) => card && typeof card.front === "string" && typeof card.back === "string")
    .map((card) => ({
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
  return [...cards].sort((a, b) => {
    const score = (card) => (card.nextReviewAt <= now ? 100 : 0) + card.misses * 20 - card.attempts * 2;
    return score(b) - score(a);
  });
}

export function rateCard(card, rating, now = Date.now()) {
  const attempts = (card.attempts || 0) + 1;
  const day = 24 * 60 * 60 * 1000;
  if (rating === "no") return { ...card, attempts, misses:(card.misses || 0) + 1, knownStreak:0, nextReviewAt:now + 10 * 60 * 1000 };
  if (rating === "hard") return { ...card, attempts, knownStreak:Math.max(0, card.knownStreak || 0), nextReviewAt:now + 6 * 60 * 60 * 1000 };
  const knownStreak = (card.knownStreak || 0) + 1;
  const delays = [day, 3 * day, 7 * day, 14 * day, 30 * day];
  return { ...card, attempts, knownStreak, nextReviewAt:now + delays[Math.min(knownStreak - 1, delays.length - 1)] };
}
