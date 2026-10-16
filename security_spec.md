# Security Specification

## 1. Data Invariants
- A race cannot exist without a valid date and number.
- A participant (horse) must exist within a valid race document path.
- Users must be authenticated to read or write race data.
- Fields like `createdAt` and `ownerId` (if added) must be immutable.

## 2. The Dirty Dozen Payloads

1.  **Missing Required Field:** { "number": 1, "name": "Prix de Paris" } (Missing date)
2.  **Invalid Type (Distance):** { "date": "2026-10-12", "number": 1, "name": "Prix", "distance": "long" }
3.  **Invalid Path ID Poisoning:** Injecting 1.5KB string as `raceId`.
4.  **Unauthorized Access (List):** Attempting to list races without authentication.
5.  **Unauthorized Write:** Attempting to update a race as a non-authenticated user.
6.  **Ghost Field Injection:** { "date": "2026-10-12", "number": 1, "name": "Prix", "isVerified": true }
7.  **Invalid Participant Data:** { "name": 123 } (Should be string)
8.  **Orphaned Participant:** Creating a participant without a parent race.
9.  **Terminal State Update:** (If status exists) Modifying finished race.
10. **Timestamp Spoofing:** Setting `createdAt` to a future date.
11. **Type Poisoning (Winner):** Updating `winner` with an array instead of a string.
12. **Blanket Read:** Attempting to read all races without specific query filters.

## 3. Test Runner
(To be implemented in firestore.rules.test.ts)
