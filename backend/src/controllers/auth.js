import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-campusbit-12345';

// Register a new Institute (with an associated Institute Admin)
export const registerInstitute = async (req, res) => {
  const { name, address, branches, adminName, adminEmail, adminPassword } = req.body;

  if (!name || !address || !branches || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if email already exists
    const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
    const existingStudent = await prisma.student.findUnique({ where: { email: adminEmail } });
    if (existingAdmin || existingStudent) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create Institute (Pending status)
    const institute = await prisma.institute.create({
      data: {
        name,
        address,
        branches, // e.g., "CSE,ECE,MECH,CIVIL"
        registrationStatus: 'PENDING',
        paymentStatus: 'UNPAID'
      }
    });

    // Create Institute Admin
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'INSTITUTE_ADMIN',
        instituteId: institute.id
      }
    });

    return res.status(201).json({
      message: 'Institute registered successfully. Awaiting Super Admin approval.',
      institute
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Register a new Student under an approved institute
export const registerStudent = async (req, res) => {
  const { name, rollNo, email, instituteId, branch, year, password, showNamePublic } = req.body;

  if (!name || !rollNo || !email || !instituteId || !branch || !year || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if institute is approved
    const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
    if (!institute || institute.registrationStatus !== 'APPROVED') {
      return res.status(400).json({ message: 'Selected institute is not approved or does not exist' });
    }

    // Check if branch matches
    const availableBranches = institute.branches.split(',').map(b => b.trim());
    if (!availableBranches.includes(branch)) {
      return res.status(400).json({ message: `Branch ${branch} is not offered by this institute` });
    }

    // Check if email or roll number already exists
    const existingStudentEmail = await prisma.student.findUnique({ where: { email } });
    const existingAdminEmail = await prisma.admin.findUnique({ where: { email } });
    if (existingStudentEmail || existingAdminEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingRoll = await prisma.student.findUnique({ where: { rollNo } });
    if (existingRoll) {
      return res.status(400).json({ message: 'Roll number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: {
        name,
        rollNo,
        email,
        instituteId,
        branch,
        year: parseInt(year),
        passwordHash,
        showNamePublic: showNamePublic !== undefined ? showNamePublic : true
      }
    });

    return res.status(201).json({
      message: 'Student registered successfully',
      studentId: student.id
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Login for both Students and Admins
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check Admin first
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) {
      const match = await bcrypt.compare(password, admin.passwordHash);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // If Institute Admin, check institute payment/approval status
      let institute = null;
      if (admin.role === 'INSTITUTE_ADMIN') {
        institute = await prisma.institute.findUnique({ where: { id: admin.instituteId } });
        // Let them login, but front-end should show warning if not approved or unpaid
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role, instituteId: admin.instituteId, name: admin.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          instituteId: admin.instituteId,
          instituteStatus: institute ? institute.registrationStatus : null,
          paymentStatus: institute ? institute.paymentStatus : null
        }
      });
    }

    // Check Student
    const student = await prisma.student.findUnique({ where: { email } });
    if (student) {
      const match = await bcrypt.compare(password, student.passwordHash);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Fetch student's institute to pass its info if needed
      const institute = await prisma.institute.findUnique({ where: { id: student.instituteId } });

      const token = jwt.sign(
        { id: student.id, email: student.email, role: 'STUDENT', instituteId: student.instituteId, name: student.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: student.id,
          name: student.name,
          email: student.email,
          role: 'STUDENT',
          rollNo: student.rollNo,
          instituteId: student.instituteId,
          instituteName: institute ? institute.name : '',
          branch: student.branch,
          year: student.year,
          showNamePublic: student.showNamePublic
        }
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get List of Approved Institutes (for student signup dropdown)
export const getApprovedInstitutes = async (req, res) => {
  try {
    const approved = await prisma.institute.findMany({
      where: { registrationStatus: 'APPROVED' },
      select: { id: true, name: true, branches: true }
    });
    return res.json(approved);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Simulate Payment for an Institute
export const payRegistrationFee = async (req, res) => {
  const { instituteId, paymentType } = req.body; // paymentType: "ONE_TIME" or "ANNUAL_SUBSCRIPTION"
  
  if (!instituteId || !paymentType) {
    return res.status(400).json({ message: 'instituteId and paymentType are required' });
  }

  try {
    const institute = await prisma.institute.update({
      where: { id: instituteId },
      data: {
        paymentStatus: 'PAID',
        paymentType
      }
    });

    return res.json({
      message: 'Payment completed successfully (Mock Mode)',
      institute
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Toggle student public leaderboard name display settings
export const toggleNamePrivacy = async (req, res) => {
  const studentId = req.user.id;
  const { showNamePublic } = req.body;

  try {
    const student = await prisma.student.update({
      where: { id: studentId },
      data: { showNamePublic }
    });

    // Also update any existing leaderboard entries for this student
    await prisma.leaderboardEntry.updateMany({
      where: { studentId },
      data: { studentName: showNamePublic ? student.name : 'Anonymous' }
    });

    return res.json({ message: 'Privacy preference updated successfully', showNamePublic });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
