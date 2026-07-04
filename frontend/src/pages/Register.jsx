import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, User, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Register() {
  const [roleType, setRoleType] = useState(null); // 'student' or 'institute'
  const [institutes, setInstitutes] = useState([]);
  
  // Student form state
  const [studentForm, setStudentForm] = useState({
    name: '', rollNo: '', email: '', instituteId: '', branch: '', year: 1, password: '', showNamePublic: true
  });
  
  // Institute form state
  const [instForm, setInstForm] = useState({
    name: '', address: '', branches: 'CSE, ECE, MECH', adminName: '', adminEmail: '', adminPassword: ''
  });

  // Flow control states
  const [registeredInstId, setRegisteredInstId] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  // Load approved institutes for student registration dropdown
  useEffect(() => {
    if (roleType === 'student') {
      fetch('http://localhost:5000/api/auth/approved-institutes')
        .then(res => res.json())
        .then(data => setInstitutes(data))
        .catch(err => console.error('Error fetching approved institutes:', err));
    }
  }, [roleType]);

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Student registration failed');
      }

      setSuccessMsg('Registration successful! Redirecting to login page...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstituteSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register-institute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Institute registration failed');
      }

      setRegisteredInstId(data.institute.id);
      setPaymentStep(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (paymentType) => {
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: registeredInstId,
          paymentType
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment confirmation failed');
      }

      setSuccessMsg('Payment completed successfully. Your registration is now pending review and approval by the Super Admin.');
      setPaymentStep(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedInstituteBranches = () => {
    const inst = institutes.find(i => i.id === studentForm.instituteId);
    if (!inst) return [];
    return inst.branches.split(',').map(b => b.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4">
      <div className="glass max-w-lg w-full p-8 rounded-2xl shadow-xl border border-slate-800">
        
        {/* Step 1: Select Role */}
        {roleType === null && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
              <p className="text-slate-400 mt-2 text-sm">Choose your registration profile to get started</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setRoleType('student')}
                className="glass glass-hover p-6 rounded-xl text-center border border-slate-800 transition flex flex-col items-center gap-3 cursor-pointer group"
              >
                <div className="bg-indigo-600/10 text-indigo-400 p-4 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition duration-300">
                  <User size={28} />
                </div>
                <h3 className="font-bold text-lg text-white">I am a Student</h3>
                <p className="text-xs text-slate-400">Participate in monthly tests, view feeds, & check state rank.</p>
              </button>

              <button
                onClick={() => setRoleType('institute')}
                className="glass glass-hover p-6 rounded-xl text-center border border-slate-800 transition flex flex-col items-center gap-3 cursor-pointer group"
              >
                <div className="bg-purple-600/10 text-purple-400 p-4 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition duration-300">
                  <School size={28} />
                </div>
                <h3 className="font-bold text-lg text-white">Institute/College</h3>
                <p className="text-xs text-slate-400">Register your campus, upload students roster, & post events.</p>
              </button>
            </div>

            <div className="text-center mt-6 text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 font-semibold hover:underline">Log in</Link>
            </div>
          </div>
        )}

        {/* Step 2: Payment screen for Institute Admin */}
        {roleType === 'institute' && paymentStep && (
          <div>
            <div className="text-center mb-6">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" />
              <h2 className="text-2xl font-extrabold text-white">Institute Profile Registered!</h2>
              <p className="text-slate-400 mt-1 text-sm">Please choose a subscription plan to complete registration</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl mb-4 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={() => handlePayment('ONE_TIME')}
                disabled={submitting}
                className="w-full glass glass-hover p-5 rounded-xl border border-slate-800 text-left hover:border-indigo-500/50 transition cursor-pointer flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-white text-lg">One-Time Registration</h4>
                  <p className="text-xs text-slate-400">Lifetime platform registration for small institutes</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-indigo-400">₹10,000</div>
                  <div className="text-[10px] text-slate-500">one-time payment</div>
                </div>
              </button>

              <button
                onClick={() => handlePayment('ANNUAL_SUBSCRIPTION')}
                disabled={submitting}
                className="w-full glass glass-hover p-5 rounded-xl border border-slate-800 text-left hover:border-purple-500/50 transition cursor-pointer flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-white text-lg">Annual Subscription</h4>
                  <p className="text-xs text-slate-400">Full annual package including monthly analytics support</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-purple-400">₹25,000</div>
                  <div className="text-[10px] text-slate-500">per year</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Message Banner */}
        {successMsg && (
          <div className="text-center py-6">
            <CheckCircle2 size={56} className="mx-auto text-green-400 mb-4 animate-bounce" />
            <h2 className="text-2xl font-extrabold text-white">Registration Complete</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-sm mx-auto">{successMsg}</p>
            {!successMsg.includes('Redirecting') && (
              <button
                onClick={() => navigate('/login')}
                className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg transition"
              >
                Go to Login
              </button>
            )}
          </div>
        )}

        {/* Student Form fields */}
        {roleType === 'student' && !successMsg && (
          <form onSubmit={handleStudentSubmit}>
            <div className="flex items-center gap-2 mb-6">
              <button type="button" onClick={() => setRoleType(null)} className="text-slate-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-extrabold text-white">Student Sign Up</h2>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl mb-4 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text" required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Roll Number</label>
                  <input
                    type="text" required
                    value={studentForm.rollNo}
                    onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                    placeholder="e.g. STU1001"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email" required
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Institute</label>
                <select
                  required
                  value={studentForm.instituteId}
                  onChange={(e) => setStudentForm({ ...studentForm, instituteId: e.target.value, branch: '' })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Approved Institute --</option>
                  {institutes.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>

              {studentForm.instituteId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Branch</label>
                    <select
                      required
                      value={studentForm.branch}
                      onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Branch --</option>
                      {selectedInstituteBranches().map(br => (
                        <option key={br} value={br}>{br}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Academic Year</label>
                    <select
                      required
                      value={studentForm.year}
                      onChange={(e) => setStudentForm({ ...studentForm, year: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password" required
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="showNamePublic"
                  checked={studentForm.showNamePublic}
                  onChange={(e) => setStudentForm({ ...studentForm, showNamePublic: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800"
                />
                <label htmlFor="showNamePublic" className="text-xs text-slate-300">
                  Allow showing my real name in public leaderboard tables.
                </label>
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition duration-150 cursor-pointer disabled:opacity-50 mt-2"
              >
                {submitting ? 'Registering...' : 'Complete Student Registration'}
              </button>
            </div>
          </form>
        )}

        {/* Institute Form fields */}
        {roleType === 'institute' && !paymentStep && !successMsg && (
          <form onSubmit={handleInstituteSubmit}>
            <div className="flex items-center gap-2 mb-6">
              <button type="button" onClick={() => setRoleType(null)} className="text-slate-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-extrabold text-white">Register Institute</h2>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl mb-4 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs leading-relaxed">
                <strong>Admin Info:</strong> Registering an institute creates both the campus profile and the primary Institute Admin account.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Institute Name</label>
                <input
                  type="text" required
                  value={instForm.name}
                  onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
                  placeholder="e.g. State Institute of Technology (SIT)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Institute Address</label>
                <textarea
                  required rows={2}
                  value={instForm.address}
                  onChange={(e) => setInstForm({ ...instForm, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Branches Offered (Comma-separated)</label>
                <input
                  type="text" required
                  value={instForm.branches}
                  onChange={(e) => setInstForm({ ...instForm, branches: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="border-t border-slate-800/80 pt-3 mt-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Name</label>
                  <input
                    type="text" required
                    value={instForm.adminName}
                    onChange={(e) => setInstForm({ ...instForm, adminName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Email</label>
                  <input
                    type="email" required
                    value={instForm.adminEmail}
                    onChange={(e) => setInstForm({ ...instForm, adminEmail: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Password</label>
                <input
                  type="password" required
                  value={instForm.adminPassword}
                  onChange={(e) => setInstForm({ ...instForm, adminPassword: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-purple-500/20 transition duration-150 cursor-pointer disabled:opacity-50 mt-2"
              >
                {submitting ? 'Submitting...' : 'Proceed to Payment'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
