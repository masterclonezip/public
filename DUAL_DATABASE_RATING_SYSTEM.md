# Dual-Database Firebase Architecture & 5-Star Rating System

## 1. Architectural Overview
To maximize Firebase Free-Tier limits and ensure "air-gapped" security for our core content, Platform utilizes a **Dual-Database Architecture**. 

* **Database A (Primary)**: Holds all read-heavy, admin-controlled data.
* **Database B (Community)**: Holds all write-heavy, user-generated content.

This prevents user-generated spam (like fake reviews) from consuming the database quota of our primary app catalog, ensuring the site never goes down due to rate limits.

---

## 2. STRICT SEPARATION OF CONCERNS (The Golden Rule)

**Mandate:** The existing architecture (Main Core Database) is working perfectly and must NOT be disturbed, touched, or modified in any way. The new Community Database must operate in total isolation.

### A. Code & Connection Isolation
* The Main Core Database will continue using the default Firebase connection.
* The Community Database (`community-firebase-project`) will be initialized as a completely separate, secondary connection (e.g., `communityApp`). 
* The two data streams will run on parallel tracks and never intersect at the database level.

### B. Admin Dashboard Sandboxing
* The existing Admin tabs (Apps, News, Settings) will remain 100% unchanged.
* We will create a **brand new, sandboxed tab** specifically for "Customer Support & Reviews".
* This new tab will exclusively read/write to the `community-firebase-project` database, ensuring zero risk of accidental modifications to the primary App Store data.

---

## 3. Infrastructure Split

### Firebase Project 1: "Main Core" (Already Active)
* **Purpose**: The absolute source of truth for the platform.
* **Collections**: `store_data` (apps), `news`, `settings`, `quick_links`, `secure_links`.
* **Access Level**: Strictly Admin-only for writes. Public for reads.
* **Security**: Safe from user-spam because public users cannot write to this database.

### Firebase Project 2: "Community & Support" (To Be Created)
* **Purpose**: User reviews, ratings, and customer support tickets.
* **Collections**: `reviews`, `app_rating_stats`, `support_tickets`.
* **Access Level**: Public (with Turnstile/IP rate limiting for writes). Admin for moderation (approve/delete).
* **Quota Management**: Absorbs 100% of the heavy write operations (users clicking stars, writing reviews).

---

## 3. The 5-Star Rating System Structure

To replicate the high-trust, Chrome-style review UI, we will structure the data in the Community Database (Db B) efficiently.

### A. The Visual UI (Frontend)
* **Star Breakdown Bar**: A visual bar chart showing the percentage of 5-star, 4-star, 3-star, etc., ratings.
* **Average Score**: A massive, bold number (e.g., "4.8") out of 5.
* **Total Count**: "Based on 1,240 reviews".
* **Review Feed**: Infinite scroll of approved text reviews below the stats.

### B. Database Schema (Database B)

To ensure high performance, we will NOT calculate the average rating by reading thousands of reviews every time a page loads. Instead, we use two collections:

#### Collection 1: `app_rating_stats` (The Aggregation)
*This document is fetched immediately when the page loads.*
```json
{
  "appId": "spin-crush",
  "averageRating": 4.8,
  "totalReviews": 1240,
  "starCounts": {
    "5": 1000,
    "4": 150,
    "3": 50,
    "2": 25,
    "1": 15
  }
}
```

#### Collection 2: `reviews` (Individual Submissions)
*These are fetched via pagination when the user scrolls down to read the text.*
```json
{
  "reviewId": "auto-generated-id",
  "appId": "spin-crush",
  "rating": 5,
  "reviewText": "Amazing graphics and smooth experience!",
  "userName": "Player99",
  "timestamp": "2026-08-21T12:00:00Z",
  "status": "published" // or "pending" for admin moderation
}
```

---

## 4. How the Server Handles the Dual-Split (Data Joining)

Because Firebase does not support cross-project joins, our Express.js backend (`server.ts`) will act as the orchestrator:

1. A user visits `www.example.com/app/spin-crush`.
2. The server requests the App Details from **Database A**.
3. The server simultaneously requests the Rating Stats (`app_rating_stats`) from **Database B**.
4. The server merges them into a single JSON object in memory.
5. The unified data is sent to the React frontend to be displayed instantly.

## 6. Next Steps for Implementation
~~1. Create the second Firebase Project ("Platform Community").~~ (✅ Completed)
~~2. Generate the second set of API keys/Service Account.~~ (✅ Completed - `community-firebase-project` Service Account JSON received)
3. Update `.env` and Github split-sync secrets to securely hold the second configuration.
4. Initialize the second Firebase app instance (`communityApp`) in `src/server/firebase.ts` alongside the main connection.
5. Build the sandboxed Express API endpoints for reviews and customer support.
6. Build the sandboxed "Reviews & Support" tab in the Admin Dashboard.
7. Build the public frontend UI component (`ReviewScoreSummary.tsx`) to display the stats.

## 7. REAL STRUCTURAL WORKFLOW & DATA PIPELINE (The "Better Idea")

To ensure the system works flawlessly, prevents spam, and provides a powerful admin experience, the workflow is designed around a **"Pending Moderation"** gateway. This prevents competitors from automatically posting 1-star fake reviews to the public site.

### Phase 1: User Submission (The Frontend)
1. **The Trigger**: A user is on the `AppDetails.tsx` page (e.g., viewing "Spin Crush") and decides to leave a review.
2. **The Security Gate**: The user clicks the stars and writes a review. When they click "Submit", a Cloudflare Turnstile token is generated in the background to prove they are human (blocking bots).
3. **The API Call**: The frontend sends the review data to a brand new, isolated Express route: `POST /api/v1/public/community/reviews`.

### Phase 2: The Backend Sandbox (The Express Server)
1. **Data Sanitization**: The server receives the review, strips out any malicious HTML, and verifies the Turnstile token.
2. **Database Write (Isolated)**: The server writes the review into the `community-firebase-project` database. 
3. **The "Pending" Status**: **CRITICAL STEP** - The review is saved with `status: "pending"`. It does *not* appear on the website yet, and it does *not* affect the 5-star average yet.

### Phase 3: The Admin Experience (The Moderation Dashboard)
1. **The Sandboxed Tab**: The Admin logs into the dashboard and clicks the new **"Community & Reviews"** tab.
2. **The Kanban View**: The Admin sees a clean list of "Pending Reviews" fetched exclusively from the community database. It displays the App Name, the Rating (1-5), the Text, and the Date.
3. **The Decision**: The Admin can click **[Approve]** or **[Delete / Mark Spam]**.

### Phase 4: Approval & The Fast-Math Aggregation
1. If the Admin clicks **[Approve]**:
   * The server updates the review in the database to `status: "published"`.
   * **The Optimization**: To keep the public website lightning fast, the server runs a Firestore Transaction. It takes the `app_rating_stats` document and simply *adds* the new numbers (e.g., `totalReviews + 1`, `5_stars + 1`, and recalculates the average). 
2. **The Live Site**: Because the `app_rating_stats` document was updated, the very next user who visits that app's page will instantly see the new 5-star average, without the server having to recalculate anything. The approved text review now appears in the infinite scroll feed at the bottom.

This workflow guarantees speed, prevents spam, gives the Admin total control, and absolutely never touches the core App Database.

---

## 8. Atomic Reviews Architecture & GitHub Split-Sync Export (2026 Engine)

1. **Pre-Warming on Admin Entry**:
   - As soon as the Admin enters `AdminDashboard.tsx`, `fetchAdminAppReviewCounts()` immediately pre-warms the atomic review counts from `community-firebase-project`.
   - Before clicking any specific app in `AdminReviewsTab.tsx`, the top **Atomic Reviews Catalog Distribution Board** is active, showing the live review count and rating for each application across the entire catalog.

2. **Zero-Quota Public Execution**:
   - The public website strictly requests only 5 reviews at a time (`limit=5`).
   - The public aggregate rating and star distribution do not query Firestore directly, avoiding quota consumption. They read from `communityCatalogStats.json` generated during the Admin release pipeline.

3. **Split-Sync Automated Delivery**:
   - When the Admin clicks GitHub Sync, `getExportableCatalogStats()` automatically generates and seals `src/lib/communityCatalogStats.json` with exact counts, average ratings, and 1-5 star distributions for all applications into the atomic release commit for `dex`.

