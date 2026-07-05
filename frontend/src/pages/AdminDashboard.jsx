import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Award, FileSpreadsheet, Building2, HelpCircle, UserPlus, Send, BarChart3, Plus, ShieldCheck, CheckCircle, Trash2, Eye, Calendar, Clock, BookOpen } from 'lucide-react';

export default function AdminDashboard({ user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState(user.role === 'SUPER_ADMIN' ? 'institutes' : 'roster');
  
  // Super Admin states
  const [institutesList, setInstitutesList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [testsList, setTestsList] = useState([]);
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [testForm, setTestForm] = useState({
    title: '', branch: 'ALL', startTime: '', endTime: '', durationMinutes: 30, questions: []
  });
  const [newQuestion, setNewQuestion] = useState({
    questionText: '', options: ['', '', '', ''], correctOption: 0, marks: 1, questionType: 'MCQ'
  });
  const [selectedTestForQuestions, setSelectedTestForQuestions] = useState(null);
  const [selectedTestQuestions, setSelectedTestQuestions] = useState([]);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [selectedTestForAddQuestion, setSelectedTestForAddQuestion] = useState(null);
  const [testSuccessMsg, setTestSuccessMsg] = useState('');
  
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

        // Fetch tests
        const testRes = await fetch('http://localhost:5000/api/tests/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const testData = await testRes.json();
        setTestsList(testData);
      } else if (user.role === 'INSTITUTE_ADMIN') {
        // Fetch institute info
        const dashboardRes = await fetch('http://localhost:5000/api/admin/institute-dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dashData = await dashboardRes.json();
        setInstStats(dashData.stats);
        setStudentsList(dashData.students);
        setInstPerformance(dashData.performance);

        // Dynamic check and update of institute registration status
        if (dashData.registrationStatus && dashData.registrationStatus !== user.instituteStatus) {
          if (onUserUpdate) {
            onUserUpdate({ ...user, instituteStatus: dashData.registrationStatus });
          }
        }
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

  // Super Admin: Create a new test
  const handleCreateTest = async (e) => {
    e.preventDefault();
    setTestSuccessMsg('');
    setError('');
    const token = localStorage.getItem('token');
    
    if (testForm.questions.length === 0) {
      setError('Please add at least one question to the test.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create test');
      
      setTestSuccessMsg('Test created successfully!');
      setTestForm({
        title: '', branch: 'ALL', startTime: '', endTime: '', durationMinutes: 30, questions: []
      });
      setShowCreateTest(false);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddQuestionToNewTest = () => {
    if (!newQuestion.questionText || newQuestion.options.some(opt => !opt.trim())) {
      alert('Please fill in the question text and all four options.');
      return;
    }
    setTestForm({
      ...testForm,
      questions: [...testForm.questions, { ...newQuestion }]
    });
    setNewQuestion({
      questionText: '', options: ['', '', '', ''], correctOption: 0, marks: 1, questionType: 'MCQ'
    });
  };

  // Super Admin: Delete a test
  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test? All student scores and logs for this test will be permanently deleted.')) {
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${testId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        loadDashboardData();
        if (selectedTestForQuestions?.id === testId) {
          setSelectedTestForQuestions(null);
        }
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete test');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Super Admin: View questions of a test
  const handleViewQuestions = async (test) => {
    const token = localStorage.getItem('token');
    setSelectedTestForQuestions(test);
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${test.id}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSelectedTestQuestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Super Admin: Add question to an existing test
  const handlePostQuestionToExistingTest = async (e) => {
    e.preventDefault();
    if (!newQuestion.questionText || newQuestion.options.some(opt => !opt.trim())) {
      alert('Please fill in the question text and all four options.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${selectedTestForAddQuestion.id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newQuestion)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add question');

      alert('Question added successfully!');
      setNewQuestion({
        questionText: '', options: ['', '', '', ''], correctOption: 0, marks: 1, questionType: 'MCQ'
      });
      setShowAddQuestionModal(false);
      setSelectedTestForAddQuestion(null);
      loadDashboardData();
      if (selectedTestForQuestions?.id === selectedTestForAddQuestion.id) {
        handleViewQuestions(selectedTestForAddQuestion);
      }
    } catch (err) {
      alert(err.message);
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
              Your campus registration status is currently <strong>PENDING</strong>. Your student rosters and dashboard analytics will remain locked until the Super Admin activates your portal.
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
              onClick={() => setActiveTab('tests')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'tests' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Manage Challenges / Tests ({testsList.length})
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
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'post-event' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
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

        {/* SUPER ADMIN: Manage Tests Panel */}
        {user.role === 'SUPER_ADMIN' && activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/30 p-6 rounded-2xl border border-slate-800/80">
              <div>
                <h3 className="font-extrabold text-white text-lg tracking-tight">Challenge & Test Management</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-lg">
                  Create, view, delete monthly coding and MCQ tests. Add test questions for students platform-wide.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateTest(!showCreateTest);
                  setSelectedTestForQuestions(null);
                  setShowAddQuestionModal(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow transition cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>{showCreateTest ? 'Cancel Creation' : 'Create New Test'}</span>
              </button>
            </div>

            {testSuccessMsg && (
              <div className="bg-green-500/10 border border-green-500/25 p-4 rounded-xl text-xs text-green-400 flex items-center gap-2 font-bold animate-fade-in">
                <CheckCircle size={16} />
                <span>{testSuccessMsg}</span>
              </div>
            )}

            {/* Test Creation Form */}
            {showCreateTest && (
              <div className="glass p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Plus size={16} className="text-indigo-400" />
                  <span>Create New Test Challenge</span>
                </h4>

                <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Test Title</label>
                      <input
                        type="text" required
                        value={testForm.title}
                        onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                        placeholder="e.g. July Mega Hack Challenge"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Target Stream / Branch</label>
                      <select
                        value={testForm.branch}
                        onChange={(e) => setTestForm({ ...testForm, branch: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">ALL Branches</option>
                        <option value="CSE">CSE</option>
                        <option value="ECE">ECE</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Duration (Minutes)</label>
                      <input
                        type="number" required min={5}
                        value={testForm.durationMinutes}
                        onChange={(e) => setTestForm({ ...testForm, durationMinutes: parseInt(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Start Time (UTC)</label>
                      <input
                        type="datetime-local" required
                        value={testForm.startTime}
                        onChange={(e) => setTestForm({ ...testForm, startTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">End Time (UTC)</label>
                      <input
                        type="datetime-local" required
                        value={testForm.endTime}
                        onChange={(e) => setTestForm({ ...testForm, endTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Questions builder in Creation form */}
                  <div className="border-t border-slate-900 pt-4 space-y-4">
                    <h5 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-indigo-400" />
                      <span>Questions Added ({testForm.questions.length})</span>
                    </h5>

                    {testForm.questions.length > 0 && (
                      <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-2">
                        {testForm.questions.map((q, idx) => (
                          <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-start">
                            <div>
                              <div className="font-bold text-slate-200">Q{idx + 1}: {q.questionText}</div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Options: {q.options.join(' | ')} &bull; Correct: Option {q.correctOption + 1} &bull; Marks: {q.marks}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newQList = [...testForm.questions];
                                newQList.splice(idx, 1);
                                setTestForm({ ...testForm, questions: newQList });
                              }}
                              className="text-red-400 hover:text-red-300 font-semibold text-[10px] uppercase cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form to add single question to list */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
                      <div>
                        <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Question text</label>
                        <textarea
                          value={newQuestion.questionText}
                          onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                          rows={2}
                          placeholder="What is the output of print(2**3)?"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {newQuestion.options.map((opt, oIdx) => (
                          <div key={oIdx}>
                            <label className="block font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1">Option {oIdx + 1}</label>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...newQuestion.options];
                                newOpts[oIdx] = e.target.value;
                                setNewQuestion({ ...newQuestion, options: newOpts });
                              }}
                              placeholder={`Option ${oIdx + 1}`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Correct Option</label>
                          <select
                            value={newQuestion.correctOption}
                            onChange={(e) => setNewQuestion({ ...newQuestion, correctOption: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                          >
                            <option value={0}>Option 1</option>
                            <option value={1}>Option 2</option>
                            <option value={2}>Option 3</option>
                            <option value={3}>Option 4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Marks</label>
                          <input
                            type="number" min={1}
                            value={newQuestion.marks}
                            onChange={(e) => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddQuestionToNewTest}
                        className="bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/35 text-indigo-400 font-bold py-2 px-4 rounded-lg transition cursor-pointer"
                      >
                        + Add Question to Test List
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition cursor-pointer"
                  >
                    Save & Publish Challenge Test
                  </button>
                </form>
              </div>
            )}

            {/* Test list & management split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: Test list */}
              <div className="lg:col-span-2 glass rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/30">
                  <h3 className="font-bold text-sm text-slate-300">Available Platform Challenges</h3>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                    Total: {testsList.length}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-300">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                        <th className="py-3 px-4">Test Title</th>
                        <th className="py-3 px-4">Target Stream</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Questions</th>
                        <th className="py-3 px-4 text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50">
                      {testsList.map(test => (
                        <tr key={test.id} className="hover:bg-slate-900/20 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-200">
                            <div>{test.title}</div>
                            <div className="text-[9px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                              <Calendar size={10} />
                              <span>{new Date(test.startTime).toLocaleString()} - {new Date(test.endTime).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-indigo-400">{test.branch}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-medium">{test.durationMinutes} Mins</td>
                          <td className="py-3.5 px-4 text-slate-400 font-semibold">{test.questionCount} Questions</td>
                          <td className="py-3.5 px-4 text-right pr-4 flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleViewQuestions(test)}
                              className="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1 cursor-pointer text-[10px]"
                              title="View Questions"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTestForAddQuestion(test);
                                setShowAddQuestionModal(true);
                                setSelectedTestForQuestions(null);
                                setShowCreateTest(false);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 font-bold transition flex items-center gap-1 cursor-pointer text-[10px]"
                              title="Add Question"
                            >
                              <Plus size={12} /> Add Q
                            </button>
                            <button
                              onClick={() => handleDeleteTest(test.id)}
                              className="text-red-400 hover:text-red-300 font-bold transition flex items-center gap-1 cursor-pointer text-[10px]"
                              title="Delete Test"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {testsList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold">No tests registered yet. Create a test to begin.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side Panel */}
              <div className="space-y-4">
                
                {/* 1. Add Question Modal/Panel */}
                {showAddQuestionModal && selectedTestForAddQuestion && (
                  <div className="glass p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Plus size={14} className="text-emerald-400" />
                      <span>Add Question to {selectedTestForAddQuestion.title}</span>
                    </h4>

                    <form onSubmit={handlePostQuestionToExistingTest} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Question text</label>
                        <textarea
                          required
                          value={newQuestion.questionText}
                          onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                          rows={3}
                          placeholder="Enter question content..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        {newQuestion.options.map((opt, oIdx) => (
                          <div key={oIdx}>
                            <label className="block font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1">Option {oIdx + 1}</label>
                            <input
                              type="text" required
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...newQuestion.options];
                                newOpts[oIdx] = e.target.value;
                                setNewQuestion({ ...newQuestion, options: newOpts });
                              }}
                              placeholder={`Option ${oIdx + 1}`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Correct Option</label>
                          <select
                            value={newQuestion.correctOption}
                            onChange={(e) => setNewQuestion({ ...newQuestion, correctOption: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                          >
                            <option value={0}>Option 1</option>
                            <option value={1}>Option 2</option>
                            <option value={2}>Option 3</option>
                            <option value={3}>Option 4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Marks</label>
                          <input
                            type="number" min={1}
                            value={newQuestion.marks}
                            onChange={(e) => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition cursor-pointer"
                        >
                          Submit Question
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddQuestionModal(false);
                            setSelectedTestForAddQuestion(null);
                          }}
                          className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-300 font-bold py-2 px-3 rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 2. View Questions List */}
                {selectedTestForQuestions && (
                  <div className="glass p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col max-h-[60vh]">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-900">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider truncate mr-2">
                        Questions for {selectedTestForQuestions.title}
                      </h4>
                      <button
                        onClick={() => setSelectedTestForQuestions(null)}
                        className="text-slate-500 hover:text-slate-300 font-black cursor-pointer text-xs"
                      >
                        Close
                      </button>
                    </div>

                    <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                      {selectedTestQuestions.map((q, idx) => (
                        <div key={q.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
                          <div className="font-bold text-slate-200">
                            Q{idx + 1}: {q.questionText}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 font-medium">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className={parseInt(q.correctOption) === oIdx ? 'text-indigo-400 font-bold' : ''}>
                                &bull; {opt} {parseInt(q.correctOption) === oIdx ? '(Correct)' : ''}
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex justify-between">
                            <span>Type: {q.questionType}</span>
                            <span>Marks: {q.marks} pts</span>
                          </div>
                        </div>
                      ))}
                      {selectedTestQuestions.length === 0 && (
                        <div className="text-center text-slate-500 text-xs py-8 font-semibold">No questions added yet. Click "Add Q" to populate.</div>
                      )}
                    </div>
                  </div>
                )}

                {!showAddQuestionModal && !selectedTestForQuestions && (
                  <div className="glass p-6 rounded-2xl border border-slate-800/80 text-center text-slate-500 text-xs font-semibold py-12">
                    <BookOpen size={24} className="mx-auto text-slate-600 mb-2.5" />
                    Select a challenge to view its questions, delete it, or add new questions in real-time.
                  </div>
                )}

              </div>

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
