# SQL Injection

## Safety boundary

Run this lesson only against the local V1 and V2 applications included in this
repository. Do not reuse its demonstration input against systems you do not own
or have explicit permission to test.

## Objective

Compare a login request that changes query semantics in V1 with the same
request in V2, where parameterized queries preserve the intended credential
check.

## Learning flow

1. Open the SQL Injection lesson in V1 and load the guided local input.
2. Submit the existing login form and observe that V1 accepts the request.
3. Open the same lesson in V2, load the equivalent input, and submit it.
4. Observe the generic rejected response and read the mitigation summary.

## Evidence

V1 records verification only after the guided request successfully signs in.
V2 records verification only after the guided request is rejected. Progress is
stored locally in the browser and can be reset at any time.

## Mitigation

V2 validates request values before data access and repositories use SQLite
prepared statements with placeholders. Untrusted values are passed as data,
not assembled into SQL source text.
