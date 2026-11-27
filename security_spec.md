# Security Specification & Threat Model

## 1. Data Invariants
1. **Workspace Isolation**: Every database record (`letters`, `assets`, `teachers`, `students`, `employees`, `config`, `moduleConfigs`) resides under `/workspaces/{workspaceId}` and carries an immutable `ownerId` matching `workspaceId` and `request.auth.uid` (unless performed by a verified admin).
2. **Verified Identity Only**: All read and write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate Parent Integrity**: Subcollection documents under `/workspaces/{workspaceId}/...` cannot exist without a valid parent `/workspaces/{workspaceId}` document (`exists(...) || existsAfter(...)`).
4. **Temporal Integrity**: `createdAt` is locked to `request.time` on creation and immutable on update; `updatedAt` must equal `request.time` on both creation and update.
5. **Strict Key & Size Bounds**: Every document enforces `keys().hasAll(...) && keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and explicit `.size()` caps on every string, list, and map field.
6. **PII Protection**: Teacher, Student, Employee, and Correspondence documents contain PII (`telepon`, `email`, `alamat`, `nip`, `nisn`, `namaWali`). Non-owners and unverified accounts are strictly denied both `get` and `list` access.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: `request.auth == null` attempting to read `/workspaces/u1/students/s1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `request.auth.token.email == 'muhammadfadloli80@admin.sma.belajar.id'` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Cross-Tenant PII Read**: User `u2` attempting `get` on `/workspaces/u1/teachers/t1` -> `PERMISSION_DENIED`.
4. **Cross-Tenant Query Scraping**: User `u2` attempting `list` on `/workspaces/u1/students` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Create**: User `u2` creating `/workspaces/u2/assets/a1` with `ownerId: 'u1'` -> `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection**: Creating a `Letter` with an extra undeclared field `isApprovedByMinister: true` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Creating a document with a 200-character ID or invalid characters `../admin` -> `PERMISSION_DENIED`.
8. **Payload Size Exhaustion (Denial of Wallet)**: Submitting a `Student` with a 10,000-character `nama` string -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating an `Employee` with `createdAt` set to a backdated timestamp instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immortal Field Mutation**: Updating an `Asset` to change `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: Updating a `Teacher` with `jenisKelamin: 'UNKNOWN'` or `jumlah: -50` on an `Asset` -> `PERMISSION_DENIED`.
12. **Privilege Escalation**: Non-admin user attempting to write `/admins/{uid}` -> `PERMISSION_DENIED`.
