# CampusBit — State-Level University Hub & Testing Platform

CampusBit is a state-wide portal where registered colleges/institutes can manage their student rosters, post events to an Instagram-style feed, and participate in monthly competitive tests with live leaderboards and rate-limited rank lookups.

## Project Structure
```text
campusbit/
├── backend/
│   ├── prisma/
│   │   ├── dev.db             # SQLite database file
│   │   └── schema.prisma      # Prisma schema (SQLite configuration)
│   ├── src/
│   │   ├── controllers/       # Business logic (auth, events, tests, leaderboard, admin)
│   │   ├── middleware/        # JWT Verification & Rate-limiter (brute-force defense)
│   │   ├── routes/            # API Endpoints mapping
│   │   ├── utils/
│   │   │   ├── db.js          # Prisma Client setup
│   │   │   └── seed.js        # Programmatic database seeder (160+ records)
│   │   └── index.js           # Server starter (Express & Socket.io)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx            # Dynamic Login form (Students & Admins)
    │   │   ├── Register.jsx         # Sign Up (Institutes with mock checkout, Students with dropdowns)
    │   │   ├── Feed.jsx             # Instagram-style feed with liking & flat comment threads
    │   │   ├── TestList.jsx         # List of assigned and upcoming challenges
    │   │   ├── TestInterface.jsx    # LeetCode-style screen with anti-cheat visibility listeners
    │   │   ├── LeaderboardPage.jsx  # Top 100 table & rate-limited roll-number rank search
    │   │   └── AdminDashboard.jsx   # Super Admin approval tools & College bulk roster import
    │   ├── App.jsx            # Router and socket notification setup
    │   ├── index.css          # Tailwind and Glassmorphism styles
    │   └── main.jsx
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

## Setup & Running Instructions

### Prerequisites
*   Node.js v16+
*   npm

### 1. Database & Seeding (Backend)
Navigate to the `backend/` directory:
```bash
cd backend
npm install
npx prisma db push
npm run db:seed
```
*Note: Seeding programmatically creates 160+ students, 6 events with likes/comments, 1 active test, and 1 completed test with fully compiled leaderboards.*

### 2. Run the Application
Start the Backend server (runs on `http://localhost:5000`):
```bash
npm start
```

In a new terminal window, navigate to the `frontend/` directory, install packages, and start Vite (runs on `http://localhost:5173`):
```bash
cd frontend
npm install
npm run dev
```

---

## 3-Minute Demo Script

Follow these steps to demonstrate all key features of the platform:

### Step 1: Login as College Admin & Create Post
1. Open `http://localhost:5173/` in your browser.
2. Sign in as the **SIT Admin**:
   * **Email:** `sitadmin@campusbit.in`
   * **Password:** `sitpassword`
3. Click on the **Admin Portal** tab in the header.
4. Go to the **Post Campus Event** tab.
5. Fill in the form:
   * **Title:** `Robotics Championship 2026`
   * **Banner URL:** `https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800`
   * **Date:** Select any future date.
   * **Description:** `Get ready to design, code, and deploy drones in the state-wide finals.`
6. Click **Publish Event Post**.

### Step 2: Student Social Feed Interactions
1. Log out, then log in as the **Demo Student**:
   * **Email:** `student@campusbit.in`
   * **Password:** `studentpassword`
2. You will be redirected to the **Feed** (Instagram-style).
3. Scroll down to find the `Robotics Championship 2026` event.
4. Click the **Heart** icon to like the post (notice the like count increments).
5. Click the **Comment** icon. Type: `SIT is ready for this!` and press Send (comment count updates).

### Step 3: Take Test & Simulate Tab-Switch Disqualification
1. Click the **Tests** tab in the header.
2. Click **Attempt Test** on the active *State Monthly Challenge (July)*.
3. You are now in the LeetCode-style environment. The persistent countdown timer is running at the top.
4. Select an answer for the first question in the right pane.
5. **Switch tabs or click outside the window once.**
   * A warning modal will appear: *"Warning: 1 more tab switch will immediately disqualify you and submit your test."*
6. Close the warning modal.
7. **Switch tabs or click outside a second time.**
   * The anti-cheat trigger fires. The **Test Disqualified** modal blocks the screen and the test is auto-submitted.
8. Click **Exit to Dashboard**.

### Step 4: Leaderboard & Rate-Limited Roll Number Search
1. Click the **Leaderboards** tab in the header.
2. Select *State Monthly Challenge (June)* from the dropdown list.
3. You will see the State-Wide Top 100 rankings below.
4. Locate the search bar at the top of the card.
5. Enter a student roll number that is ranked outside the top 100 (e.g., `ECE112`).
6. Click **Search**.
7. The rank lookup card appears instantly showing: **Student Name**, **College**, **Global Rank (#112)**, and **Score (20 pts)**, resolving students who are not listed in the main top-100 list!
