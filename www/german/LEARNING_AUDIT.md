# WortWerk system and learning audit

## Executive finding

The old trainer was a form-recall quiz, not a complete language-learning system. It could make isolated spellings and inflections more familiar, but it treated one cleared queue as learning, mixed recognition and production into one score, offered almost no meaningful input or output, and had no durable due-date model. It was useful for short-term rehearsal but inefficient for long-term retention and poor preparation for actually listening, writing, or speaking.

The rebuilt system treats vocabulary memory and communicative ability as related but separate goals. It adds a first-learning sequence, adaptive review scheduling, listening, sentence production, speaking prompts, original Goethe-aligned tasks, weekly skill balance, and a calmer reward system.

## Code and security audit

### Critical issues repaired

- Browser-controlled identity: every progress/reset/history route trusted a `userId` supplied by the page. Any visitor could read or overwrite another learner's data. All private routes now derive identity from a signed, `HttpOnly`, `SameSite=Strict` session cookie.
- Open administrator routes: invite codes and the vocabulary editor had no server-side admin check. They now require a current authenticated administrator on every request.
- Administrator escalation: registering the literal username `Admin` created an admin without an invite. Registration can now create only ordinary accounts; the first admin is explicitly bootstrapped from deployment-only environment values.
- Embedded database password: the credential was removed from source. It must be rotated and supplied through PM2's environment.
- Cross-origin exposure: unrestricted CORS was removed. Unsafe requests reject cross-site origins and cross-site fetches.
- Public vocabulary file: the client now reads `/api/vocabulary`; Node returns `404` for `/output.json`. The reverse proxy must send all paths through Node for this to be effective.
- Script injection: dynamic screens use DOM text nodes or escaping; admin values are validated and reject markup/control characters. A content security policy blocks inline and third-party scripts.
- Client-trusted rewards: the server now calculates focus points, validates totals, caps fields, and makes session completion idempotent.
- Duplicate/colliding vocabulary keys: progress is keyed by `(user, word, type)`, so the noun `Fernsehen` and verb `fernsehen`, or noun/adjective `reich`, no longer overwrite one another.
- Unsafe file writes: vocabulary changes are serialized, validated, written to a temporary file, and atomically renamed.
- Missing platform hardening: security headers, request limits, login/register throttles, small JSON limits, generic login errors, short-lived signed sessions, and production HTTPS cookies were added.

### Functional defects repaired

- Random sorting (`sort(() => Math.random() - .5)`) produced biased shuffles; Fisher–Yates is now used.
- Every wrong answer inserted two random duplicates, so a queue could grow unpredictably. One targeted retry now returns after intervening items; the scheduler also shortens its next inter-session interval.
- A word became permanently “learned” after one queue. Mastery now requires at least four successful reviews and a stability interval of at least 14 days; mastered words still return later.
- Multiple-choice success counted like productive recall. Recognition, recall, forms, listening, writing, and speaking are now labeled and handled as different tasks.
- Speed dominated rewards. Speed now influences only the scheduling rating within sensible bounds; points come mainly from accurate work, with a small session-accuracy bonus.
- Fixed 1.5/10-second waits slowed practice and removed learner control. Feedback remains visible until the learner continues.
- Resume/session completion could double-award points. Each session has a unique completion key.
- Errors were commonly swallowed, leaving blank UI. Private requests now show actionable failure states and expired sessions return to sign-in.
- Inline handlers, missing viewport settings, small targets, color-only feedback, and animation without reduced-motion support were replaced with keyboard-accessible controls, live regions, semantic pages, responsive layouts, high-contrast support, and reduced motion.

### Vocabulary data findings

The JSON is structurally consistent: 509 entries (249 nouns, 130 verbs, 95 entries in the adjective/adverb group, and 35 prepositions), with no missing base words or meanings and no same-category duplicates. There are two legitimate cross-category spellings that exposed the old key bug: `Fernsehen/fernsehen` and `reich`.

The larger remaining data problem is taxonomy and depth. The `adjectives` array also contains adverbs, determiners, pronoun-like items, and particles such as `noch`, `immer`, `jeder`, `dort`, and `einmal`. Entries lack CEFR level, frequency rank, topic, pronunciation/audio, example sentence, collocations, register, separability/reflexivity, verb auxiliary, and sense-specific meanings. The application now labels that group “adjective / adverb” instead of pretending every item declines or compares, but the next high-value content project is a schema-enriched, human-verified A1 list.

## What effective methods have in common

Across laboratory research, second-language studies, teaching syntheses, and practitioner guidance, the common core is:

1. **Retrieve instead of reread.** Trying to produce an answer strengthens later access more than another passive exposure, provided corrective feedback follows.
2. **Space across days.** Reviews should happen after some forgetting, with the interval growing after success and shrinking after a lapse.
3. **Meet a word more than once and in more than one direction.** Form → meaning builds recognition; meaning → form and sentence use build productive knowledge.
4. **Attach form to use.** Spelling, sound, morphology, meaning, context, and collocation are different aspects of word knowledge.
5. **Mix, but do it intentionally.** Interleaving word types and skills improves discrimination; random variety without a learning objective is noise.
6. **Practice the target behavior.** Listening improves through meaningful listening; speaking and writing require actual output, not only translation questions.
7. **Use fast feedback and visible progress.** Feedback should correct the memory trace. Rewards should support consistency and mastery rather than encourage easy-question farming.

## What each approach uniquely contributes

- **Retrieval practice:** explains why successful effort is the learning event and why repeated study after a correct response adds little compared with another later test.
- **Spacing research:** explains *when* to return. The best gap depends on the desired retention period; there is no single magic interval.
- **Receptive/productive vocabulary research:** shows that the direction of practice changes what is learned. Productive learning produces broader productive gains, while receptive learning especially helps recognition of meaning.
- **Nation's Four Strands:** prevents the entire course becoming flashcards. A balanced course allocates substantial time to meaning-focused input, meaning-focused output, deliberate form study, and fluency with already-known language.
- **Interleaving:** improves choosing between competing forms or task types, especially after an initial foundation exists.
- **Context and personal elaboration:** give a word more retrieval routes and connect it to situations the learner may actually talk about.
- **Goethe training:** makes the outcome concrete. A1 preparation covers listening, reading, writing, and speaking with everyday communicative tasks; later Goethe certificates use separately measurable skill modules.
- **Purposeful gamification:** can increase motivation and engagement, but the evidence is more heterogeneous than for spacing/retrieval. Points and streaks are therefore secondary feedback, not the curriculum.

## The upgraded training cycle

### First encounter

For a small batch (default six words):

1. **Orient:** see the German form, article or principal forms, concise meaning, and hear German pronunciation.
2. **Recognize:** choose the meaning among same-part-of-speech distractors. This is a scaffold, not mastery.
3. **Recall:** produce German from English; nouns require the article.
4. **Reconstruct:** recall plural, principal verb forms, comparison, or governed case when applicable.
5. **Use later:** a sentence-production prompt appears in later smart reviews, after the form is available enough to carry meaning.

The batch is interleaved so retrieval is separated by other items. A miss produces one same-session retry after intervening questions and a roughly ten-minute next due time.

### Later reviews

Every scored attempt has a 0–3 memory rating derived from correctness and bounded response time, or a learner self-rating for open production:

- **Again:** major lapse; stability drops sharply and the item returns in about ten minutes.
- **Hard:** successful but effortful; interval grows cautiously.
- **Good:** accurate recall; interval expands normally.
- **Easy:** fast, accurate recall; interval expands more, but remains capped.

Priority combines overdue time, difficulty, lapse count, and current stability. This means an overdue, difficult word with several lapses rises above an easy word that is not due. A word reaches “mastered” only after at least four successful review events and a predicted stable interval of 14 days; mastery is not permanent.

### Practical rhythm

- **Daily (10–20 minutes):** finish due smart reviews first, then learn 3–8 new words only when the due load is comfortable.
- **Three times weekly:** include listening and one short sentence or speaking response.
- **Weekly:** complete one four-skill Goethe mix and inspect the balance panel. Add extra practice to the neglected strand.
- **Every 3–4 weeks:** use Goethe's official timed practice material as a real simulation. The built-in tasks are original practice, not a substitute for an official mock exam.

## Page-by-page product audit

- **Home:** communicates the method and the difference between recognition and usable language; returning learners can continue directly.
- **Sign in/register:** accessible forms, password/autofill semantics, clear validation, protected cookie login, invite-only registration.
- **Today dashboard:** due count, new/learning/mastered separation, daily rhythm, accuracy, focus points, smart/new/listening/Goethe modes, adjustable batch size, four-strand weekly balance, roadmap, history, safe reset, and admin editor.
- **Practice:** explicit skill and memory state, compact progress, first-exposure cards, typed retrieval, same-category recognition, morphology, contextual fill-in-the-blank work, German text-to-speech listening, sentence production, browser speech recognition when available, Goethe-aligned reading/listening/writing/speaking, learner-controlled feedback, keyboard support, and pause/resume.
- **Summary:** accuracy and retrieval counts, points, level movement, feedback that treats mistakes as scheduling information, and a short-round continuation.

## Design rationale

The redesign applies Apple Human Interface Guidance as principles rather than copying an operating system: one clear primary action, strong information hierarchy, system typography, restrained adaptive color, familiar controls, large touch targets, responsive layout, meaningful brief motion, no wait-for-animation interactions, light/dark appearance, text plus shape for status, reduced-motion support, and increased-contrast support.

## Evidence and official references

- Karpicke & Roediger, *The Critical Importance of Retrieval for Learning*: https://doi.org/10.1126/science.1152408
- Cepeda et al., *Distributed Practice in Verbal Recall Tasks*: https://digitalcommons.usf.edu/psy_facpub/1771/
- Nakata, repeated retrieval in L2 vocabulary: https://doi.org/10.1017/S0272263116000280
- Webb, receptive vs. productive word-pair learning: https://doi.org/10.1177/0033688209343854
- Webb et al., intentional vocabulary-learning meta-analysis: https://doi.org/10.1111/modl.12671
- Nation, *The Four Strands*: https://doi.org/10.2167/illt039.0
- The Learning Scientists on interleaving: https://www.learningscientists.org/blog/2016/8/11-1
- British Council on meaningful context and spaced review: https://www.britishcouncil.org/voices-magazine/ten-ways-learn-new-words-language-learner
- Goethe-Institut A1 exam training and official materials: https://www.goethe.de/en/spr/prf/ueb/pa1.html
- Goethe-Institut exam overview and modular skill structure: https://www.goethe.de/en/spr/prf.html
- Zhang & Hasim, gamification in EFL/ESL systematic review: https://doi.org/10.3389/fpsyg.2022.1030790
- Apple Human Interface Guidelines — Foundations: https://developer.apple.com/design/human-interface-guidelines/foundations
- Apple Human Interface Guidelines — Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Apple Human Interface Guidelines — Color: https://developer.apple.com/design/human-interface-guidelines/color
- Apple Human Interface Guidelines — Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple Human Interface Guidelines — Motion: https://developer.apple.com/design/human-interface-guidelines/motion
