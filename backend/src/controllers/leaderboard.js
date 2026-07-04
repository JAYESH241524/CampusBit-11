import prisma from '../utils/db.js';

// Publish results for a test (Super Admin only)
// Computes ranks and populates LeaderboardEntry table, then broadcasts via Socket.io
export const publishTestResults = async (req, res) => {
  const { testId } = req.params;

  try {
    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Get all attempts for this test
    const attempts = await prisma.testAttempt.findMany({
      where: {
        testId,
        status: { in: ['COMPLETED', 'AUTO_SUBMITTED', 'DISQUALIFIED'] }
      },
      orderBy: [
        { score: 'desc' },
        { submittedAt: 'asc' } // Tie-breaker: earlier submission wins
      ]
    });

    if (attempts.length === 0) {
      return res.status(400).json({ message: 'No student attempts found for this test to compile results.' });
    }

    // Compute ranks and compile list
    const entries = [];
    let rank = 1;

    for (const attempt of attempts) {
      const student = await prisma.student.findUnique({
        where: { id: attempt.studentId }
      });

      if (!student) continue;

      const institute = await prisma.institute.findUnique({
        where: { id: student.instituteId }
      });

      const entry = {
        testId,
        studentId: student.id,
        studentName: student.showNamePublic ? student.name : 'Anonymous',
        rollNo: student.rollNo,
        instituteId: student.instituteId,
        instituteName: institute ? institute.name : 'Unknown Institute',
        rank,
        score: attempt.score,
        branch: student.branch,
        submittedAt: attempt.submittedAt || new Date()
      };

      entries.push(entry);
      rank++;
    }

    // Clear previous leaderboard entries for this test if any
    await prisma.leaderboardEntry.deleteMany({ where: { testId } });

    // Bulk insert entries
    await Promise.all(
      entries.map(async (entry) => {
        await prisma.leaderboardEntry.create({ data: entry });
      })
    );

    // Broadcast Socket.io event for live updates
    if (global.io) {
      global.io.emit('LEADERBOARD_PUBLISHED', {
        testId,
        testTitle: test.title,
        message: `Results for monthly test "${test.title}" have been published live!`
      });
    }

    return res.json({
      message: `Results published successfully. Compiled ${entries.length} entries.`,
      entriesCount: entries.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get Top 100 Leaderboard for a test & branch
export const getTop100Leaderboard = async (req, res) => {
  const { testId } = req.params;
  const { branch } = req.query; // optional branch filter e.g. CSE, ECE

  try {
    const where = { testId };
    if (branch && branch !== 'ALL') {
      where.branch = branch;
    }

    // Fetch entries sorted by rank asc (or score desc)
    const entries = await prisma.leaderboardEntry.findMany({
      where,
      orderBy: { rank: 'asc' },
      take: 100
    });

    // Re-adjust rank counter relative to this branch set if requested, 
    // but the actual full rank (across branches or branch-specific) should be shown.
    // In our case, the rank calculated in compile phase is global state-wide rank.
    // We can show this global rank or relative rank. Let's show the global compile rank.
    return res.json(entries);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Look up a rank by student roll number (public/rate-limited)
export const searchRankByRollNo = async (req, res) => {
  const { testId } = req.params;
  const { rollNo } = req.query;

  if (!rollNo) {
    return res.status(400).json({ message: 'Roll number is required' });
  }

  try {
    // Find matching leaderboard entry for this test and roll number
    const entry = await prisma.leaderboardEntry.findFirst({
      where: {
        testId,
        rollNo: rollNo.trim()
      }
    });

    if (!entry) {
      return res.status(404).json({ message: 'Student rank not found. Verify roll number or check if results are published.' });
    }

    return res.json(entry);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get list of completed tests with published leaderboards
export const getCompletedTests = async (req, res) => {
  try {
    // Select tests that have at least one entry in LeaderboardEntry
    const publishedTestIdsObj = await prisma.leaderboardEntry.groupBy({
      by: ['testId']
    });
    const testIds = publishedTestIdsObj.map(e => e.testId);

    const tests = await prisma.test.findMany({
      where: { id: { in: testIds } },
      orderBy: { endTime: 'desc' }
    });

    return res.json(tests);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
