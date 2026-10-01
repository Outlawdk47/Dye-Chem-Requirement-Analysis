# Security Specification: Purchasing Requirement Analysis

## 1. Data Invariants
- `datasets/{datasetId}`: An uploaded dataset document must have a valid string ID, `uploadedBy` matching the authenticated user's UID (or public demo dataset if flagged), valid numeric counts (`rowCount >= 0`), and terminal state controls (`status in ['uploaded', 'analyzed', 'archived']`).
- `datasets/{datasetId}/records/{recordId}`: Subcollection records can only be created or modified if the parent dataset belongs to the authenticated user.
- `settings/{userId}`: Only the user matching `{userId}` can read or write their settings.
- `scenarios/{scenarioId}`: Scenarios can only be created, read, or modified by their creator (`createdBy == request.auth.uid`).
- Catch-all rule denies any unauthorized document paths.

## 2. The Dirty Dozen Payloads (Targeting Exploits)
1. **Unauthenticated Write**: An unauthenticated user attempts to create a dataset. (Rejected: `request.auth != null`)
2. **Identity Spoofing**: An authenticated user `userA` attempts to write `uploadedBy: "userB"`. (Rejected: `incoming().uploadedBy == request.auth.uid`)
3. **Parent Document Bypass**: A user tries to create records in a dataset owned by another user. (Rejected: Parent check `get(...).data.uploadedBy == request.auth.uid`)
4. **Denial of Wallet Junk String**: Injecting a 2MB payload into `materialName` or `columnMapping`. (Rejected: `.size() <= MAX` limits)
5. **ID Poisoning Attack**: Passing `../../junk` or oversized 1000-character document ID. (Rejected: `isValidId(id)`)
6. **Shadow Update (Ghost Field)**: Adding an unwhitelisted field `isAdmin: true` to a dataset update. (Rejected: `affectedKeys().hasOnly(...)`)
7. **Negative Counts Exploitation**: Setting `rowCount: -500` or invalid types. (Rejected: schema validation check `is number && rowCount >= 0`)
8. **Settings Hijacking**: User `userA` attempting to overwrite `settings/userB`. (Rejected: `{userId} == request.auth.uid`)
9. **Tampering with Immortal Creation Field**: Modifying `uploadedAt` or `uploadedBy` during dataset update. (Rejected: immutable field checks)
10. **Unauthenticated List Scraping**: Attempting to list all datasets without UID filtering. (Rejected: `allow list: if isSignedIn() && resource.data.uploadedBy == request.auth.uid`)
11. **Malicious Scenario Injection**: Creating a scenario with `createdBy: "someone_else"`. (Rejected: `incoming().createdBy == request.auth.uid`)
12. **Status Shortcutting with Invalid Enum**: Setting `status: 'corrupted_state'`. (Rejected: enum check in validator)
