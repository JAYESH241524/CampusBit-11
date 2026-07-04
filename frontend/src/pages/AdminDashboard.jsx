import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Award, FileSpreadsheet, Building2, HelpCircle, UserPlus, Send, BarChart3, Plus, ShieldCheck, CheckCircle } from 'lucide-react';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState(user.role === 'SUPER_ADMIN' ? 'institutes' : 'roster');
  
  // Super Admin states
  const [institutesList, setInstitutesList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Institute Admin states
  const [instStats, setInstStats] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [instPerformance, setInstPerformance] = useState({});

  // Event Posting state
  const [eventForm, setEventForm] = useState({
    title: '', description: '', bannerUrl: '', eventDate: '', category: 'Hackathon', registrationLink: ''
  });
  const [eventMsg, setEventMsg] = useState('');

  // Bulk CSV Roster state
  const [csvText, setCsvText] = useState("name,rollNo,email,branch,year,password\nRohit Sharma,CSE101,rohit@sit.edu,CSE,3,pass123\nSneha Patel,ECE101,sneha@sit.edu,ECE,3,pass123");
  const [bulkResult, setBulkResult] = useState('');
  const [bulkErrors, setBulkErrors] = useState([]);

  // Common loader
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load dashboard data based on role
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      if (user.role === 'SUPER_ADMIN') {
        // Fetch institutes
        const instRes = await fetch('http://localhost:5000/api/admin/institutes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const instData = await instRes.json();
        setInstitutesList(instData);

        // Fetch analytics
        const anaRes = await fetch('http://localhost:5000/api/admin/analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const anaData = await anaRes.json();
        setAnalytics(anaData);
      } else if (user.role === 'INSTITUTE_ADMIN') {
        // Fetch institute info
        const dashboardRes = await fetch('http://localhost:5000/api/admin/institute-dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dashData = await dashboardRes.json();
        setInstStats(dashData.stats);
        setStudentsList(dashData.students);
        setInstPerformance(dashData.performance);
      }
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Super Admin: Update Institute Status (Approve/Reject)
  const handleUpdateStatus = async (instId, status) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/admin/institutes/${instId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Super Admin: Publish Test Results
  const handlePublishResults = async (testId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/leaderboard/${testId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      alert(data.message);
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Institute Admin: Post Event
  const handlePostEvent = async (e) => {
    e.preventDefault();
    setEventMsg('');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to post event');
      }

      setEventMsg('Event posted successfully to feed!');
      setEventForm({
        title: '', description: '', bannerUrl: '', eventDate: '', category: 'Hackathon', registrationLink: ''
      });
    } catch (err) {
      setEventMsg(`Error: ${err.message}`);
    }
  };

  // Institute Admin: Simulate Bulk Import Students
  const handleBulkImport = async () => {
    setBulkResult('');
    setBulkErrors([]);
    const token = localStorage.getItem('token');

    // Simple CSV parser logic
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      setBulkResult('Error: CSV text must contain at least headers and one row');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const studentsList = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map(v => v.trim());
      const studentObj = {};
      headers.forEach((header, idx) => {
        studentObj[header] = values[idx];
      });
      studentsList.push(studentObj);
    }

    try {
      const response = await fetch('http://localhost:5000/api/admin/bulk-add-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentsList })
      });
      const data = await response.json();

      setBulkResult(data.message);
      if (data.errors && data.errors.length > 0) {
        setBulkErrors(data.errors);
      }
      loadDashboardData(); // Reload list
    } catch (err) {
      setBulkResult(`Network Error: ${err.message}`);
    }
  };

  if (loading && !analytics && studentsList.length === 0) {
    return <div className="text-center py-12 text-slate-500">Loading admin console...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Role Warning Header for Institute Admin */}
      {user.role === 'INSTITUTE_ADMIN' && user.instituteStatus !== 'APPROVED' && (
        <div className="bg-amber-600/10 border border-amber-500/25 p-4 rounded-2xl flex items-start gap-3 text-amber-400">
          <ShieldAlert className="shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm">Awaiting Administrator Approval</h4>
            <p className="text-xs text-slate-300 leading-relaxed mt-1">
              Your campus registration status is currently <strong>PENDING</strong>. Your student rosters, event postings, and dashboard analytics will remain locked until the Super Admin activates your portal.
            </p>
          </div>
        </div>
      )}

      {/* Admin Title */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600/10 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/20">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">
            {user.role === 'SUPER_ADMIN' ? 'Platform Command Center' : 'Institute Roster & Feed'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Role-based administrative tools and performance metrics</p>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="border-b border-slate-900 flex gap-2 shrink-0">
        {user.role === 'SUPER_ADMIN' ? (
          <>
            <button
              onClick={() => setActiveTab('institutes')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'institutes' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Registered Colleges ({institutesList.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'analytics' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              System Analytics
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('roster')}
              disabled={user.instituteStatus !== 'APPROVED'}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'roster' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              } disabled:opacity-40`}
            >
              Student Roster ({studentsList.length})
            </button>
            <button
              onClick={() => setActiveTab('post-event')}
              disabled={user.instituteStatus !== 'APPROVED'}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'post-event' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              } disabled:opacity-40`}
            >
              Post Campus Event
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              disabled={user.instituteStatus !== 'APPROVED'}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'performance' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              } disabled:opacity-40`}
            >
              Test Performances
            </button>
          </>
        )}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        
        {/* SUPER ADMIN: Institutes List */}
        {user.role === 'SUPER_ADMIN' && activeTab === 'institutes' && (
          <div className="glass rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-300">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">College / Institute</th>
                    <th className="py-4 px-6">Offered Streams</th>
                    <th className="py-4 px-6">Payment status</th>
                    <th className="py-4 px-6">Registration Status</th>
                    <th className="py-4 px-6 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/50">
                  {institutesList.map(inst => (
                    <tr key={inst.id} className="hover:bg-slate-900/20 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-100">{inst.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{inst.address}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-400">{inst.branches}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          inst.paymentStatus === 'PAID' ? 'bg-green-600/10 text-green-400 border border-green-500/20' : 'bg-red-600/10 text-red-400 border border-red-500/20'
                        }`}>
                          {inst.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          inst.registrationStatus === 'APPROVED' ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20' :
                          inst.registrationStatus === 'REJECTED' ? 'bg-red-600/15 text-red-400 border border-red-500/20' :
                          'bg-amber-600/15 text-amber-400 border border-amber-500/20 animate-pulse'
                        }`}>
                          {inst.registrationStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right pr-6 flex items-center justify-end gap-2">
                        {inst.registrationStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(inst.id, 'APPROVED')}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded text-[10px] cursor-pointer transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(inst.id, 'REJECTED')}
                              className="bg-slate-900 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 font-bold py-1 px-3 rounded text-[10px] cursor-pointer transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {inst.registrationStatus === 'APPROVED' && (
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <ShieldCheck size={12} className="text-indigo-400" /> Approved
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUPER ADMIN: Compile and Analytics Panel */}
        {user.role === 'SUPER_ADMIN' && activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Compile results Trigger */}
            <div className="glass p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base">Compile Monthly Test Results</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                  Trigger ranking computation for active challenges. Once compiled, it publishes student ranks to the public boards and alerts users in real-time.
                </p>
              </div>
              <button
                onClick={() => handlePublishResults(
                  // Complete June Challenge seed ID or active test, let's target completedTest in seed
                  // Since we have the completed test, let's publish results
                  // In our seed code, completed test is compiled. Let's let them compile the Active Test or completed test!
                  // We can retrieve the active test ID or Completed test ID.
                  // For the sake of the compiler trigger, let's publish the active test results!
                  'SUPER_ADMIN_COMPILE_SELECTION' // Handled safely on server to compile any active or mock tests.
                )}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow transition cursor-pointer shrink-0"
              >
                Compile Results
              </button>
            </div>

            {/* Analytics Summary */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-5 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registered Colleges</div>
                  <div className="text-2xl font-black text-white mt-1">{analytics.institutes.total}</div>
                  <div className="text-[10px] text-indigo-400 font-semibold mt-0.5">{analytics.institutes.approved} Approved &bull; {analytics.institutes.pending} Pending</div>
                </div>
                <div className="glass p-5 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Students</div>
                  <div className="text-2xl font-black text-white mt-1">{analytics.students}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Platform wide rosters</div>
                </div>
                <div className="glass p-5 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conduct Tests</div>
                  <div className="text-2xl font-black text-white mt-1">{analytics.tests}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Active monthly slots</div>
                </div>
                <div className="glass p-5 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Social Feed Posts</div>
                  <div className="text-2xl font-black text-white mt-1">{analytics.events}</div>
                  <div className="text-[10px] text-indigo-400 font-semibold mt-0.5">{analytics.likes} Likes &bull; {analytics.comments} Comments</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INSTITUTE ADMIN: Students Roster Management */}
        {user.role === 'INSTITUTE_ADMIN' && activeTab === 'roster' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: roster list */}
            <div className="lg:col-span-2 glass rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/30">
                <h3 className="font-bold text-sm text-slate-300">Registered Students</h3>
                <span className="text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                  Total: {studentsList.length}
                </span>
              </div>
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50">
                    {studentsList.map(st => (
                      <tr key={st.id} className="hover:bg-slate-900/20 transition">
                        <td className="py-3 px-4 font-bold text-slate-200">{st.name}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono">{st.rollNo}</td>
                        <td className="py-3 px-4 text-slate-400">{st.branch}</td>
                        <td className="py-3 px-4 text-slate-400">{st.year} Yr</td>
                      </tr>
                    ))}
                    {studentsList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500 font-semibold">No students in roster. Use bulk import to populate.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side: bulk csv add mockup (Required) */}
            <div className="glass p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col">
              <h3 className="font-bold text-sm text-slate-300 mb-2 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-400" />
                <span>Bulk Import Students (CSV)</span>
              </h3>
              
              <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                Paste student information in comma-separated format. Make sure header columns match: <strong>name,rollNo,email,branch,year,password</strong>
              </p>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={8}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none resize-none flex-1 mb-4"
              />

              <button
                onClick={handleBulkImport}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow hover:shadow-indigo-500/10"
              >
                Simulate CSV Upload
              </button>

              {bulkResult && (
                <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-indigo-400 break-words leading-relaxed font-semibold">
                  {bulkResult}
                </div>
              )}

              {bulkErrors.length > 0 && (
                <div className="mt-2 max-h-[15vh] overflow-y-auto bg-red-950/20 border border-red-950/40 p-2.5 rounded-xl text-[9px] text-red-400 space-y-1">
                  {bulkErrors.map((err, eIdx) => (
                    <div key={eIdx}>&bull; {err}</div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* INSTITUTE ADMIN: Post Event Form */}
        {user.role === 'INSTITUTE_ADMIN' && activeTab === 'post-event' && (
          <div className="glass max-w-xl mx-auto p-8 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus size={18} className="text-indigo-400" />
              <span>Create Event Post</span>
            </h3>

            {eventMsg && (
              <div className={`p-3 rounded-xl text-xs mb-4 border ${
                eventMsg.includes('Error') ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-green-500/10 border-green-500/25 text-green-400'
              }`}>
                {eventMsg}
              </div>
            )}

            <form onSubmit={handlePostEvent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Event Title</label>
                  <input
                    type="text" required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Pitch">Pitch Contest</option>
                    <option value="Placement">Placement Fair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Banner Image URL (Required)</label>
                <input
                  type="url" required
                  value={eventForm.bannerUrl}
                  onChange={(e) => setEventForm({ ...eventForm, bannerUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Event Date</label>
                <input
                  type="datetime-local" required
                  value={eventForm.eventDate}
                  onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Description / Caption</label>
                <textarea
                  required rows={4}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">External Registration Link (Optional)</label>
                <input
                  type="url"
                  value={eventForm.registrationLink}
                  onChange={(e) => setEventForm({ ...eventForm, registrationLink: e.target.value })}
                  placeholder="https://mycollege.edu/register"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition cursor-pointer"
              >
                Publish Event Post
              </button>
            </form>
          </div>
        )}

        {/* INSTITUTE ADMIN: Students Performance Dashboard */}
        {user.role === 'INSTITUTE_ADMIN' && activeTab === 'performance' && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-400" />
              <span>Campus Performance Overview</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(instPerformance).map(testId => {
                const perf = instPerformance[testId];
                return (
                  <div key={testId} className="glass p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{perf.testTitle}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                        Total attempts: {perf.totalAttempts} &bull; Disqualifications: {perf.disqualifiedCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average Score</div>
                      <div className="text-xl font-black text-indigo-400 mt-0.5">{perf.averageScore} pts</div>
                    </div>
                  </div>
                );
              })}

              {Object.keys(instPerformance).length === 0 && (
                <div className="glass col-span-2 p-12 rounded-2xl text-center border border-slate-800/80 text-slate-500 font-semibold">
                  No active students have taken monthly tests yet.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
