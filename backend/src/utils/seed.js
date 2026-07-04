import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean database
  await prisma.leaderboardEntry.deleteMany({});
  await prisma.tabSwitchLog.deleteMany({});
  await prisma.testAttempt.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.eventComment.deleteMany({});
  await prisma.eventLike.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.institute.deleteMany({});

  console.log('Database cleared.');

  const passwordHash = await bcrypt.hash('password123', 10);
  const studentHash = await bcrypt.hash('student123', 10);

  // 1. Create Super Admin
  await prisma.admin.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@campusbit.in',
      passwordHash: await bcrypt.hash('superpassword', 10),
      role: 'SUPER_ADMIN'
    }
  });
  console.log('Super Admin created.');

  // 2. Create 3 Institutes (2 Approved, 1 Pending)
  const sit = await prisma.institute.create({
    data: {
      name: 'State Institute of Technology (SIT)',
      address: '123 Tech Park, Sector 5, State Capital',
      branches: 'CSE,ECE,MECH,CIVIL',
      registrationStatus: 'APPROVED',
      paymentStatus: 'PAID',
      paymentType: 'ANNUAL_SUBSCRIPTION'
    }
  });

  const mec = await prisma.institute.create({
    data: {
      name: 'Metro Engineering College (MEC)',
      address: '456 College Lane, Metro City',
      branches: 'CSE,ECE,CIVIL',
      registrationStatus: 'APPROVED',
      paymentStatus: 'PAID',
      paymentType: 'ONE_TIME'
    }
  });

  const apex = await prisma.institute.create({
    data: {
      name: 'Apex University (APEX)',
      address: '789 University Way, North Hills',
      branches: 'CSE,ECE,MECH',
      registrationStatus: 'PENDING',
      paymentStatus: 'UNPAID'
    }
  });
  console.log('Institutes created.');

  // 3. Create Institute Admins
  await prisma.admin.create({
    data: {
      name: 'SIT Admin',
      email: 'sitadmin@campusbit.in',
      passwordHash: await bcrypt.hash('sitpassword', 10),
      role: 'INSTITUTE_ADMIN',
      instituteId: sit.id
    }
  });

  await prisma.admin.create({
    data: {
      name: 'MEC Admin',
      email: 'mecadmin@campusbit.in',
      passwordHash: await bcrypt.hash('mecpassword', 10),
      role: 'INSTITUTE_ADMIN',
      instituteId: mec.id
    }
  });

  await prisma.admin.create({
    data: {
      name: 'APEX Admin',
      email: 'apexadmin@campusbit.in',
      passwordHash: await bcrypt.hash('apexpassword', 10),
      role: 'INSTITUTE_ADMIN',
      instituteId: apex.id
    }
  });
  console.log('Institute Admins created.');

  // 4. Create a specific test student for logging in
  const testStudent = await prisma.student.create({
    data: {
      name: 'Jane Doe',
      rollNo: 'STU001',
      email: 'student@campusbit.in',
      instituteId: sit.id,
      branch: 'CSE',
      year: 3,
      passwordHash: await bcrypt.hash('studentpassword', 10),
      showNamePublic: true
    }
  });
  console.log('Demo Student created (student@campusbit.in / studentpassword).');

  // 5. Generate 160 students programmatically (60 CSE, 50 ECE, 50 MECH)
  const branches = ['CSE', 'ECE', 'MECH'];
  const institutes = [sit, mec]; // Only put students in approved institutes
  const students = [testStudent];

  // Helper for names
  const firstNames = ['Amit', 'Rahul', 'Priya', 'Sneha', 'Vikram', 'Rohan', 'Neha', 'Anjali', 'Karan', 'Aditya', 'Siddharth', 'Divya', 'Pooja', 'Abhishek', 'Kunal', 'Tanvi'];
  const lastNames = ['Sharma', 'Verma', 'Gupta', 'Kumar', 'Singh', 'Patel', 'Joshi', 'Mehta', 'Rao', 'Reddy', 'Nair', 'Iyer', 'Sen', 'Das', 'Roy', 'Choudhury'];

  let studentIndex = 2; // STU001 is index 1

  for (const branch of branches) {
    const targetCount = branch === 'CSE' ? 60 : branch === 'ECE' ? 50 : 50;
    
    for (let i = 0; i < targetCount; i++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fName} ${lName} (${studentIndex})`;
      
      const padIndex = studentIndex.toString().padStart(3, '0');
      const rollNo = `${branch}${padIndex}`;
      const email = `student${studentIndex}@campusbit.in`;
      const inst = institutes[Math.floor(Math.random() * institutes.length)];
      const year = Math.floor(Math.random() * 4) + 1; // 1-4
      const showNamePublic = Math.random() > 0.15; // 85% opted-in

      const student = await prisma.student.create({
        data: {
          name,
          rollNo,
          email,
          instituteId: inst.id,
          branch,
          year,
          passwordHash: studentHash,
          showNamePublic
        }
      });
      students.push(student);
      studentIndex++;
    }
  }
  console.log(`Generated ${students.length} students across SIT and MEC.`);

  // 6. Create 6 Events
  const event1 = await prisma.event.create({
    data: {
      instituteId: sit.id,
      instituteName: sit.name,
      title: 'State Hackathon 2026',
      description: 'The biggest coding competition of the state is here! Build innovative software solutions to solve real-world administrative problems. Cash prizes up to ₹1,00,000 to be won. Open to all engineering branches. Register today!',
      bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-08-15T09:00:00Z'),
      category: 'Hackathon',
      registrationLink: 'https://statehackathon2026.gov.in'
    }
  });

  const event2 = await prisma.event.create({
    data: {
      instituteId: mec.id,
      instituteName: mec.name,
      title: 'Robotics Workshop: Build Your Own Drone',
      description: 'Learn the fundamentals of UAV flight, hardware controller configuration, and sensor calibration in this intensive 3-day hands-on workshop led by industry drone pilots. Free components kit provided to early registrants.',
      bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-07-20T10:00:00Z'),
      category: 'Workshop',
      registrationLink: 'https://metroengg.edu/drone-workshop'
    }
  });

  const event3 = await prisma.event.create({
    data: {
      instituteId: sit.id,
      instituteName: sit.name,
      title: 'AI & Deep Learning Symposium',
      description: 'Keynote sessions and panel discussions on Generative AI, Large Language Models, and deep learning architectures. Guest speakers from leading tech organizations will present their latest production deployment cases.',
      bannerUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-09-05T09:30:00Z'),
      category: 'Seminar'
    }
  });

  const event4 = await prisma.event.create({
    data: {
      instituteId: mec.id,
      instituteName: mec.name,
      title: 'Venture Pitch 2026',
      description: 'Got an innovative startup idea? Pitch it to state angel networks and venture capitalists. Secure seed funding, incubation spaces, and dedicated mentoring from serial entrepreneurs. Apply by submitting your deck.',
      bannerUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-07-30T11:00:00Z'),
      category: 'Pitch'
    }
  });

  const event5 = await prisma.event.create({
    data: {
      instituteId: sit.id,
      instituteName: sit.name,
      title: 'Mega Campus Placement Fair',
      description: 'Top companies from IT, Core Engineering, and Consulting sectors visiting for joint placements. Over 40+ recruiting companies under one roof. Keep your updated resumes ready. Dress code: Formal.',
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-08-25T08:30:00Z'),
      category: 'Placement'
    }
  });
  console.log('Events created.');

  // 7. Seed Liking and Comments
  // Likes for event 1
  for (let i = 0; i < 24; i++) {
    const student = students[Math.floor(Math.random() * students.length)];
    try {
      await prisma.eventLike.create({
        data: {
          eventId: event1.id,
          studentId: student.id
        }
      });
    } catch (_) {} // Ignore duplicate constraint fails
  }

  // Comments for event 1
  await prisma.eventComment.create({
    data: {
      eventId: event1.id,
      studentId: students[1].id,
      studentName: students[1].name,
      commentText: 'This looks amazing! Registered immediately.'
    }
  });

  await prisma.eventComment.create({
    data: {
      eventId: event1.id,
      studentId: students[2].id,
      studentName: students[2].name,
      commentText: 'Are students from Civil branch allowed to participate?'
    }
  });

  await prisma.eventComment.create({
    data: {
      eventId: event1.id,
      studentId: sit.id, // sit admin name is SIT Admin, let's map a dummy name or just students
      studentName: 'SIT Admin',
      commentText: 'Yes, students from all engineering streams are eligible!'
    }
  });
  console.log('Event Likes and Comments seeded.');

  // 8. Create a Completed Test (June Challenge)
  const completedTest = await prisma.test.create({
    data: {
      title: 'State Monthly Challenge (June)',
      branch: 'ALL',
      startTime: new Date('2026-06-10T10:00:00Z'),
      endTime: new Date('2026-06-10T12:00:00Z'),
      durationMinutes: 120,
      createdBy: 'SUPER_ADMIN_SEED'
    }
  });

  // Create 5 MCQ questions for completed test
  const q1 = await prisma.question.create({
    data: {
      testId: completedTest.id,
      questionText: 'What is the time complexity of searching in a Balanced Binary Search Tree?',
      options: JSON.stringify(['O(1)', 'O(log N)', 'O(N)', 'O(N log N)']),
      correctOption: 1, // O(log N)
      marks: 20,
      questionType: 'MCQ'
    }
  });

  const q2 = await prisma.question.create({
    data: {
      testId: completedTest.id,
      questionText: 'Which of the following database isolation levels avoids dirty reads but allows non-repeatable reads?',
      options: JSON.stringify(['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable']),
      correctOption: 1, // Read Committed
      marks: 20,
      questionType: 'MCQ'
    }
  });

  const q3 = await prisma.question.create({
    data: {
      testId: completedTest.id,
      questionText: 'Which HTTP status code represents "Internal Server Error"?',
      options: JSON.stringify(['400', '401', '403', '500']),
      correctOption: 3, // 500
      marks: 20,
      questionType: 'MCQ'
    }
  });

  const q4 = await prisma.question.create({
    data: {
      testId: completedTest.id,
      questionText: 'Which of the following is not a valid CSS display property value?',
      options: JSON.stringify(['flex', 'grid', 'block', 'center']),
      correctOption: 3, // center (it is text-align value, display is flex/grid/block)
      marks: 20,
      questionType: 'MCQ'
    }
  });

  const q5 = await prisma.question.create({
    data: {
      testId: completedTest.id,
      questionText: 'In React, what hook is used to perform side effects in functional components?',
      options: JSON.stringify(['useState', 'useContext', 'useEffect', 'useMemo']),
      correctOption: 2, // useEffect
      marks: 20,
      questionType: 'MCQ'
    }
  });
  console.log('Completed Test and Questions created.');

  // 9. Generate Attempts and compile Leaderboard Entries for Completed Test
  // Generate random scores between 20, 40, 60, 80, 100 for all 160 students
  const testAttempts = [];
  const leaderboardEntries = [];

  for (const student of students) {
    // Generate answers e.g. {"q1": correct_or_not, ...}
    const scoreOptions = [20, 40, 60, 80, 100];
    const score = scoreOptions[Math.floor(Math.random() * scoreOptions.length)];
    
    // Construct dummy answers object matching the score
    const correctCount = score / 20;
    const answersObj = {};
    
    const qs = [q1, q2, q3, q4, q5];
    for (let idx = 0; idx < 5; idx++) {
      const q = qs[idx];
      if (idx < correctCount) {
        answersObj[q.id] = q.correctOption; // correct
      } else {
        answersObj[q.id] = (q.correctOption + 1) % 4; // incorrect
      }
    }

    const attempt = await prisma.testAttempt.create({
      data: {
        testId: completedTest.id,
        studentId: student.id,
        answers: JSON.stringify(answersObj),
        score,
        status: 'COMPLETED',
        submittedAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)), // randomized time in last hour
        tabSwitchCount: Math.floor(Math.random() * 2) // 0 or 1 switch
      }
    });
    testAttempts.push(attempt);
  }

  // Sort by score desc, then by submittedAt asc
  testAttempts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });

  // Save Leaderboard Entries
  let rank = 1;
  for (const attempt of testAttempts) {
    const student = students.find(s => s.id === attempt.studentId);
    if (!student) continue;

    const inst = student.instituteId === sit.id ? sit : mec;

    await prisma.leaderboardEntry.create({
      data: {
        testId: completedTest.id,
        studentId: student.id,
        studentName: student.showNamePublic ? student.name : 'Anonymous',
        rollNo: student.rollNo,
        instituteId: student.instituteId,
        instituteName: inst.name,
        rank,
        score: attempt.score,
        branch: student.branch,
        submittedAt: attempt.submittedAt
      }
    });
    rank++;
  }
  console.log(`Leaderboard compiled for Completed Test. Inserted ${rank - 1} rankings.`);

  // 10. Create an Active Test (July Challenge - Open now for student)
  const activeTest = await prisma.test.create({
    data: {
      title: 'State Monthly Challenge (July)',
      branch: 'CSE', // CSE specific test
      startTime: new Date(Date.now() - 3600000), // opened 1 hour ago
      endTime: new Date(Date.now() + 7200000), // closes in 2 hours
      durationMinutes: 60,
      createdBy: 'SUPER_ADMIN_SEED'
    }
  });

  // Create questions for active test
  await prisma.question.create({
    data: {
      testId: activeTest.id,
      questionText: 'Which of the following sorting algorithms has the best worst-case time complexity?',
      options: JSON.stringify(['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Merge Sort']),
      correctOption: 3, // Merge Sort: O(N log N)
      marks: 10,
      questionType: 'MCQ'
    }
  });

  await prisma.question.create({
    data: {
      testId: activeTest.id,
      questionText: 'What does SQL stand for?',
      options: JSON.stringify(['Structured Question Language', 'Structured Query Language', 'Simple Query Language', 'State Query Language']),
      correctOption: 1, // Structured Query Language
      marks: 10,
      questionType: 'MCQ'
    }
  });

  await prisma.question.create({
    data: {
      testId: activeTest.id,
      questionText: 'Which of the following is NOT a JavaScript framework/library?',
      options: JSON.stringify(['React', 'Django', 'Angular', 'Vue']),
      correctOption: 1, // Django (Python)
      marks: 10,
      questionType: 'MCQ'
    }
  });

  await prisma.question.create({
    data: {
      testId: activeTest.id,
      questionText: 'What is the primary purpose of DNS (Domain Name System)?',
      options: JSON.stringify([
        'To encrypt web traffic',
        'To cache web pages for faster load times',
        'To map human-readable domain names to IP addresses',
        'To route network packets between routers'
      ]),
      correctOption: 2, // map domain names to IP
      marks: 10,
      questionType: 'MCQ'
    }
  });

  await prisma.question.create({
    data: {
      testId: activeTest.id,
      questionText: 'Which layer of the OSI model is responsible for routing packets?',
      options: JSON.stringify(['Physical Layer', 'Data Link Layer', 'Network Layer', 'Transport Layer']),
      correctOption: 2, // Network Layer
      marks: 10,
      questionType: 'MCQ'
    }
  });
  console.log('Active Test (July Challenge) created.');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
