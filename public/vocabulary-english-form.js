// Prefix the displayed English form without changing the stored translation or card identity.
const verbsByTopic = {
 contact: 'understand|repeat|introduce',
 health: 'recover|hurt|bleed|breathe|sneeze|swallow|rest|heal',
 school: 'learn|study|read|write|spell|count|practise|explain|remember|forget|know|think',
 travel: 'travel|check out|book a room|rent a car|get lost',
 leisure: 'draw|paint|sing|dance|play|listen|collect|enjoy|relax|download|clap',
 sport: 'run|walk|swim|ride|jump|throw|catch|kick|climb|win|lose|score|stretch',
 communication: [
  'speak|talk|say|tell|ask|reply|call|meet|visit|invite|thank|apologise|smile|laugh|cry|shout',
  'agree|disagree|choose|decide|hope|believe|feel|try|promise|offer|accept|refuse|send|receive|show|share|join|follow|allow|let|seem|happen',
  'describe|mention|suggest|advise|recommend|warn|complain|applaud|greet|welcome|wave goodbye|whisper|murmur|interrupt|notice|recognise|realise',
  'suppose|guess|wonder|imagine|dream|prefer|wish|expect|mean|mind|care|miss|trust|forgive|blame|respect|admire|encourage|comfort',
  'cheer up|calm down|cheat|lie to someone|deny|admit|prove|check|compare|discuss|argue about|quarrel|persuade|insist|invite someone over',
  "gather|celebrate|behave|belong|include|exclude|introduce oneself|get to know|keep in touch|make friends|fall in love|get married|get divorced|break up|get along|take turns"
 ].join('|'),
 'building-blocks': 'have to',
 organising: 'arrange|cancel|postpone|confirm|remind',
 cooperation: 'improve|develop|achieve|manage|organise|discuss|attend|contribute|cooperate|prepare for|focus on|deal with|depend on',
 services: 'try on|take back|exchange|order|borrow',
 society: 'vote|convince|consider|assume|argue',
 environment: 'recycle|reuse|reduce|protect|preserve|prevent|avoid|replace|upload|delete|save|search',
 relationships: "cope with|rely on|look forward to|put up with|make up one's mind"
};
const infinitives = new Map(Object.entries(verbsByTopic).map(([topic, words]) => [topic, new Set(words.split('|'))]));
const namesWithArticle = new Set(['United Kingdom', 'United States', 'Netherlands']);
const namesWithoutArticle = new Set(['Switzerland', 'Turkey']);

export function englishVocabularyForm(word, topicId = word.topicId) {
 const {back, front} = word;
 if (!topicId || /^(?:the|a|an|to)(?:\s|$)/i.test(back)) return back;
 if (namesWithArticle.has(back)) return 'the ' + back;
 if (/^(der|die|das) /.test(front)) {
  // Proper names usually stand alone, including months and weekdays.
  if (namesWithoutArticle.has(back) || (topicId === 'time' && /^[A-Z]/.test(back))) return back;
  return 'the ' + back;
 }
 // The daily activities topic consists of verb entries. In other topics,
 // distinguish verbs from adjectives, modals and fixed expressions.
 if (topicId === 'actions' || infinitives.get(topicId)?.has(back)) return 'to ' + back;
 return back;
}
