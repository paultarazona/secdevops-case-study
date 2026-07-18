# Broken Access Control (IDOR)

## Safety boundary

Run this lesson only against the seeded local V1 and V2 applications.

## Objective

Sign in as `alice` and request Bob's seeded resource (`#2`). V1 returns it because it checks only the identifier. V2 applies an ownership check and returns a generic not-found response.

## Evidence

The lesson records verification only after the controlled request has produced the expected local behavior for its version.
