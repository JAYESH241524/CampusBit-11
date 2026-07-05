import prisma from '../utils/db.js';

// Helper: Calculate score based on saved answers
const calculateScore = async (testId, answersObj) => {
  const questions = await prisma.question.findMany({ where: { testId } });
  let totalScore = 0;

  for (const question of questions) {
    const studentAnswerIndex = answersObj[question.id];
    if (studentAnswerIndex !== undefined && parseInt(studentAnswerIndex) === question.correctOption) {
      totalScore += question.marks;
    }
  }
  return totalScore;
};

// Create a new test (Super Admin only)
export const createTest = async (req, res) => {
  const { title, branch, startTime, endTime, durationMinutes, questions } = req.body;
  const adminId = req.user.id;

  if (!title || !branch || !startTime || !endTime || !durationMinutes || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ message: 'All fields and questions array are required' });
  }

  try {
    const test = await prisma.test.create({
      data: {
        title,
        branch, // e.g., "CSE", "ECE", "MECH" or "ALL"
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        durationMinutes: parseInt(durationMinutes),
        createdBy: adminId
      }
    });

    // Create questions
    const createdQuestions = [];
    for (const q of questions) {
      const question = await prisma.question.create({
        data: {
          testId: test.id,
          questionText: q.questionText,
          options: JSON.stringify(q.options), // Store as stringified array
          correctOption: parseInt(q.correctOption),
          marks: parseInt(q.marks || 1),
          questionType: q.questionType || 'MCQ'
        }
      });
      createdQuestions.push(question);
    }

    return res.status(201).json({ message: 'Test created successfully', test, questions: createdQuestions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get available tests for Student (matching their branch or "ALL")
export const getAvailableTests = async (req, res) => {
  const { branch } = req.user; // from JWT token (only student role checks this)

  try {
    const tests = await prisma.test.findMany({
      where: {
        OR: [
          { branch: 'ALL' },
          { branch: branch }
        ]
      },
      orderBy: { startTime: 'desc' }
    });

    // For each test, get attempt status
    const testsWithAttempt = await Promise.all(
      tests.map(async (test) => {
        const attempt = await prisma.testAttempt.findUnique({
          where: {
            testId_studentId: {
              testId: test.id,
              studentId: req.user.id
            }
          }
        });

        return {
          ...test,
          attemptStatus: attempt ? attempt.status : 'NOT_STARTED',
          attemptScore: attempt ? attempt.score : null
        };
      })
    );

    return res.json(testsWithAttempt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Start a test (creates attempt, blocks if already completed or disqualified)
export const startTestAttempt = async (req, res) => {
  const { testId } = req.params;
  const studentId = req.user.id;

  try {
    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Check date bounds
    const now = new Date();
    if (now < new Date(test.startTime) || now > new Date(test.endTime)) {
      return res.status(400).json({ message: 'Test window is currently closed' });
    }

    // Check existing attempt
    let attempt = await prisma.testAttempt.findUnique({
      where: {
        testId_studentId: {
          testId,
          studentId
        }
      }
    });

    if (attempt) {
      if (attempt.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          message: 'You have already submitted or were disqualified from this test',
          status: attempt.status
        });
      }
      // Return existing attempt
      const questions = await prisma.question.findMany({
        where: { testId },
        select: { id: true, questionText: true, options: true, marks: true, questionType: true }
      });

      const parsedQuestions = questions.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }));

      return res.json({ attempt, questions: parsedQuestions });
    }

    // Create new attempt
    attempt = await prisma.testAttempt.create({
      data: {
        testId,
        studentId,
        answers: '{}',
        status: 'IN_PROGRESS',
        tabSwitchCount: 0
      }
    });

    const questions = await prisma.question.findMany({
      where: { testId },
      select: { id: true, questionText: true, options: true, marks: true, questionType: true }
    });

    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    return res.status(201).json({ attempt, questions: parsedQuestions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Periodically save progress / auto-save answers
export const saveProgress = async (req, res) => {
  const { testId } = req.params;
  const { answers } = req.body; // e.g. { "q1_uuid": 0, "q2_uuid": 2 }
  const studentId = req.user.id;

  if (!answers) {
    return res.status(400).json({ message: 'Answers object is required' });
  }

  try {
    const attempt = await prisma.testAttempt.findUnique({
      where: { testId_studentId: { testId, studentId } }
    });

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active attempt found to update' });
    }

    const updated = await prisma.testAttempt.update({
      where: { testId_studentId: { testId, studentId } },
      data: {
        answers: JSON.stringify(answers)
      }
    });

    return res.json({ message: 'Progress saved', answers: JSON.parse(updated.answers) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Log tab switch, disqualify if switch count reaches 2
export const logTabSwitch = async (req, res) => {
  const { testId } = req.params;
  const studentId = req.user.id;

  try {
    const attempt = await prisma.testAttempt.findUnique({
      where: { testId_studentId: { testId, studentId } }
    });

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active attempt found' });
    }

    const newSwitchCount = attempt.tabSwitchCount + 1;

    // Create log
    await prisma.tabSwitchLog.create({
      data: {
        testId,
        studentId,
        switchNumber: newSwitchCount
      }
    });

    if (newSwitchCount >= 2) {
      // DISQUALIFY student immediately
      const answersObj = JSON.parse(attempt.answers);
      const score = await calculateScore(testId, answersObj);

      const finalAttempt = await prisma.testAttempt.update({
        where: { testId_studentId: { testId, studentId } },
        data: {
          tabSwitchCount: newSwitchCount,
          status: 'DISQUALIFIED',
          score: score, // Store current score, though they are disqualified
          submittedAt: new Date()
        }
      });

      return res.json({
        disqualified: true,
        message: 'You have been disqualified for tab-switch violations (max 2 limits reached). Your test has been auto-submitted.',
        attempt: finalAttempt
      });
    }

    // Otherwise, increment switch count and warning
    const updated = await prisma.testAttempt.update({
      where: { testId_studentId: { testId, studentId } },
      data: {
        tabSwitchCount: newSwitchCount
      }
    });

    return res.json({
      disqualified: false,
      message: 'Tab switch warning registered',
      tabSwitchCount: newSwitchCount
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Formally submit test
export const submitTest = async (req, res) => {
  const { testId } = req.params;
  const studentId = req.user.id;
  const { answers } = req.body; // final answers object

  try {
    const attempt = await prisma.testAttempt.findUnique({
      where: { testId_studentId: { testId, studentId } }
    });

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active test attempt to submit' });
    }

    const finalAnswers = answers || JSON.parse(attempt.answers);
    const score = await calculateScore(testId, finalAnswers);

    const updated = await prisma.testAttempt.update({
      where: { testId_studentId: { testId, studentId } },
      data: {
        answers: JSON.stringify(finalAnswers),
        score,
        status: 'COMPLETED',
        submittedAt: new Date()
      }
    });

    return res.json({ message: 'Test submitted successfully', attempt: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all tests (Super Admin only)
export const getAllTests = async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const testsWithQuestionCount = await Promise.all(
      tests.map(async (test) => {
        const questionCount = await prisma.question.count({ where: { testId: test.id } });
        return {
          ...test,
          questionCount
        };
      })
    );
    return res.json(testsWithQuestionCount);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get questions for a specific test (Super Admin only)
export const getTestQuestions = async (req, res) => {
  const { testId } = req.params;
  try {
    const questions = await prisma.question.findMany({ where: { testId } });
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));
    return res.json(parsedQuestions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Add a question to an existing test (Super Admin only)
export const addQuestionToTest = async (req, res) => {
  const { testId } = req.params;
  const { questionText, options, correctOption, marks, questionType } = req.body;

  if (!questionText || !options || correctOption === undefined) {
    return res.status(400).json({ message: 'Question text, options, and correctOption are required' });
  }

  try {
    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const question = await prisma.question.create({
      data: {
        testId,
        questionText,
        options: JSON.stringify(options),
        correctOption: parseInt(correctOption),
        marks: parseInt(marks || 1),
        questionType: questionType || 'MCQ'
      }
    });

    return res.status(201).json({ message: 'Question added successfully', question: { ...question, options } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a test (Super Admin only)
export const deleteTest = async (req, res) => {
  const { testId } = req.params;
  try {
    // Delete questions, attempts and logs first
    await prisma.tabSwitchLog.deleteMany({ where: { testId } });
    await prisma.testAttempt.deleteMany({ where: { testId } });
    await prisma.question.deleteMany({ where: { testId } });
    await prisma.test.delete({ where: { id: testId } });
    return res.json({ message: 'Test and associated questions/attempts/logs deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

