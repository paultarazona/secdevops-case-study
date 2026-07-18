# Unsafe File Upload

## Safety boundary

Run this lesson only against the seeded local applications. The lesson uses a
small in-memory text file and does not target the host filesystem.

## Objective

Compare a client-controlled filename in V1 with V2's content validation,
size limit, server-generated filename, and non-public upload storage.

## Evidence

Sign in as `alice` and run the controlled upload. V1 accepts the supplied
filename. V2 stores the content under a generated identifier that contains no
client path segments.
