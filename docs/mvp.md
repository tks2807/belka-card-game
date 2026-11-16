# Match MVP

MVP is cosmetic and does not affect ELO or stored player statistics.
For every completed trick, its taker receives the card points played by opponents;
the partner receives the points of their own card in that trick. The taker's own
card contributes nothing. Sum these credits across all deals, including 60:60
replays. Among the winning team, highest contribution wins; most tricks breaks
a tie. Exact ties share MVP. Zero-point tricks still count for the tie-breaker.

Counters live in matchHistory.contributions and survive game-state persistence.
A rematch resets them. Legacy saved games without counters receive no MVP until
a new match, avoiding an award based on only part of a match. No completed tricks
means no award. MVP is also available on surrender, based on completed tricks.

Run `npm run test:mvp` for database-free integration checks.
