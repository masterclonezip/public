# Platform Database & Sync Architecture

This document outlines the workflow and architecture for how the reviews and reports are synchronized between the front-end, the local backend cache, and the remote Firestore database. 

## 1. Core Architecture Layers

The system uses a highly available, fault-tolerant 3-tier architecture to ensure fast read times, offline capability, and persistence across deployments:

1. **In-Memory Cache (`communityStoreService.ts`)**:
   - The active state of all reviews and reports lives in a fast `Map` in memory.
   - All `GET` requests (public and admin) read instantly from this memory.
   - All `POST`, `PUT`, `DELETE` operations immediately update this memory, giving the user an instantaneous response.

2. **Local Disk Backup (`community_local_backup.json`)**:
   - Every time the memory is updated, a debounced write triggers to save the entire memory state to `community_local_backup.json`.
   - The save operation uses an atomic `.tmp` swap (`fs.renameSync`) to ensure the file is never corrupted during a server crash.
   - When the server starts up (e.g., after scaling up in Cloud Run), it immediately loads this file into memory to serve users instantly without waiting for Firestore.

3. **Cloud Firestore (Primary Remote Database)**:
   - Contains collections: `reviews`, `reports`, and `store_data`.
   - Used to synchronize data permanently in the cloud, allowing multiple server instances to share the same state.
   - Supports both the **Firebase Admin SDK** (gRPC) and a **REST API Fallback** in case the SDK fails to initialize or experiences connection issues.

## 2. Synchronization Workflow

### A. Admin / User Submits or Edits Data
1. Frontend makes a request (e.g., `PUT /api/v1/admin/community/reviews/:id`).
2. Express Router receives the request and calls the corresponding method in `communityStoreService.ts`.
3. The service merges the changes and strictly generates a new `updated_at` timestamp: `new Date().toISOString()`.
4. The service updates the local in-memory `Map`.
5. The service asynchronously pushes the update to Firestore (`db.collection('reviews').doc(id).set(..., { merge: true })`).
6. The service calls `saveToDiskAndQueueCloudSync()` to persist the state locally.

### B. Background Polling (Instance Synchronization)
1. Every 60 seconds, `setInterval` triggers `initFromFirestore(true)`.
2. The server queries Firestore for the latest 500 reviews and reports.
3. For each document, it compares the Firestore timestamp (`d.updated_at`) against the local memory timestamp (`existing.updated_at`).
4. **CRITICAL MERGE RULE**: 
   - If the local memory's `updated_at` is **greater than or equal to** the remote Firestore `updated_at` (or if the remote document is missing an `updated_at` field), the local memory is considered **newer** and is kept.
   - If the remote Firestore timestamp is strictly newer, the local memory is overwritten with the cloud data.
   
## 3. Resolving the "Disappearing Data" Bug

### The Problem
Previously, when an admin edited a review, the frontend updated perfectly. However, if the page was refreshed or if the background polling triggered, the edit disappeared.
This was caused by a flawed timestamp comparison in `initFromFirestore`:
- Older reviews in Firestore did not always have a valid `updated_at` field.
- In JavaScript, `new Date(undefined)` resolves to `Invalid Date`.
- The comparison `LocalTime >= Invalid Date` incorrectly evaluated to `false`.
- Consequently, the polling mechanism assumed the local data was stale and blindly overwrote it with the older, incomplete Firestore document, erasing the admin's edits.

### The Fix
The merge resolution has been patched to handle missing cloud timestamps defensively:
```typescript
const remoteTime = d.updated_at ? new Date(d.updated_at).getTime() : 0;
const localTime = new Date(existing.updated_at).getTime();
if (localTime >= remoteTime) {
  return; // Local is newer, keep local.
}
```
If a Firestore document lacks an `updated_at` timestamp, its time is treated as Epoch 0, ensuring that any local modification instantly takes precedence and successfully synchronizes.

## 4. Quota Exhaustion Protections
If Firestore exceeds the daily free tier limits, a `429 RESOURCE_EXHAUSTED` error is thrown.
- The `isQuotaError` trap detects this across both the gRPC and REST pipelines.
- A 15-minute global cooldown (`quotaExhaustedUntil`) is activated.
- During this cooldown, all reads and writes to Firestore are skipped.
- The application seamlessly falls back entirely to the In-Memory Cache and `community_local_backup.json`, ensuring 100% uptime and 0 data loss.
