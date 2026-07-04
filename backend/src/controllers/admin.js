import prisma from '../utils/db.js';

// Super Admin Analytics
export const getSuperAdminAnalytics = async (req, res) => {
  try {
    const totalInstitutes = await prisma.institute.count();
    const approvedInstitutes = await prisma.institute.count({ where: { registrationStatus: 'APPROVED' } });
    const pendingInstitutes = await prisma.institute.count({ where: { registrationStatus: 'PENDING' } });

    const totalStudents = await prisma.student.count();
    const totalTests = await prisma.test.count();
    const totalEvents = await prisma.event.count();
    const totalLikes = await prisma.eventLike.count();
    const totalComments = await prisma.eventComment.count({ where: { isDeleted: false } });

    // Branch-wise distribution of students
    const branchDistribution = await prisma.student.groupBy({
      by: ['branch'],
      _count: { id: true }
    });

    const formattedBranches = branchDistribution.reduce((acc, curr) => {
      acc[curr.branch] = curr._count.id;
      return acc;
    }, {});

    return res.json({
      institutes: { total: totalInstitutes, approved: approvedInstitutes, pending: pendingInstitutes },
      students: totalStudents,
      tests: totalTests,
      events: totalEvents,
      likes: totalLikes,
      comments: totalComments,
      branchDistribution: formattedBranches
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Super Admin: List institutes and approve/reject them
export const listInstitutes = async (req, res) => {
  try {
    const list = await prisma.institute.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(list);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateInstituteStatus = async (req, res) => {
  const { instituteId } = req.params;
  const { status } = req.body; // "APPROVED", "REJECTED"

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  try {
    const updated = await prisma.institute.update({
      where: { id: instituteId },
      data: { registrationStatus: status }
    });

    return res.json({ message: `Institute ${status.toLowerCase()} successfully`, institute: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Institute Admin: Get their students' roster and performance dashboard
export const getInstituteDashboard = async (req, res) => {
  const { instituteId } = req.user;

  try {
    const studentCount = await prisma.student.count({ where: { instituteId } });
    const eventCount = await prisma.event.count({ where: { instituteId } });

    // Fetch student list
    const students = await prisma.student.findMany({
      where: { instituteId },
      select: { id: true, name: true, rollNo: true, email: true, branch: true, year: true }
    });

    // Fetch tests attempts by students in this institute
    const studentIds = students.map(s => s.id);
    const attempts = await prisma.testAttempt.findMany({
      where: { studentId: { in: studentIds } }
    });

    // Match attempts to see average performance per test
    const performanceByTest = {};
    for (const attempt of attempts) {
      if (!performanceByTest[attempt.testId]) {
        const test = await prisma.test.findUnique({ where: { id: attempt.testId } });
        performanceByTest[attempt.testId] = {
          testTitle: test ? test.title : 'Deleted Test',
          totalAttempts: 0,
          totalScore: 0,
          averageScore: 0,
          disqualifiedCount: 0
        };
      }
      const stats = performanceByTest[attempt.testId];
      stats.totalAttempts += 1;
      stats.totalScore += attempt.score;
      if (attempt.status === 'DISQUALIFIED') {
        stats.disqualifiedCount += 1;
      }
    }

    // Calc averages
    Object.keys(performanceByTest).forEach(tId => {
      const stats = performanceByTest[tId];
      stats.averageScore = stats.totalAttempts > 0 ? (stats.totalScore / stats.totalAttempts).toFixed(1) : 0;
    });

    return res.json({
      stats: { studentCount, eventCount },
      students,
      performance: performanceByTest
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Bulk upload students (simulate CSV parse)
export const bulkAddStudents = async (req, res) => {
  const { instituteId } = req.user;
  const { studentsList } = req.body; // Array of { name, rollNo, email, branch, year, password }

  if (!studentsList || !Array.isArray(studentsList) || studentsList.length === 0) {
    return res.status(400).json({ message: 'valid studentsList array is required' });
  }

  try {
    const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    const availableBranches = institute.branches.split(',').map(b => b.trim());

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const st of studentsList) {
      const { name, rollNo, email, branch, year, password } = st;

      if (!name || !rollNo || !email || !branch || !year || !password) {
        failedCount++;
        errors.push(`Row for ${name || 'unknown'}: Missing required fields`);
        continue;
      }

      if (!availableBranches.includes(branch)) {
        failedCount++;
        errors.push(`Row for ${name} (${rollNo}): Branch ${branch} is not offered by your institute`);
        continue;
      }

      // Check duplicates
      const dupEmail = await prisma.student.findUnique({ where: { email } });
      const dupRoll = await prisma.student.findUnique({ where: { rollNo } });

      if (dupEmail || dupRoll) {
        failedCount++;
        errors.push(`Row for ${name} (${rollNo}): Roll number or Email already exists`);
        continue;
      }

      // Hash password and save
      const passwordHash = await bcrypt.hash(password.toString(), 10);
      await prisma.student.create({
        data: {
          name,
          rollNo: rollNo.toString(),
          email,
          instituteId,
          branch,
          year: parseInt(year),
          passwordHash
        }
      });
      successCount++;
    }

    return res.json({
      message: `Bulk import completed. Successfully imported: ${successCount}. Failed: ${failedCount}.`,
      successCount,
      failedCount,
      errors
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
