import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Clock, AlertTriangle, CheckCircle, Lock } from 'lucide-react';

export default function TestList() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchTests = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/tests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load tests');
      const data = await response.json();
      setTests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleStartTest = (testId) => {
    navigate(`/tests/${testId}`);
  };

  const getTestBadge = (test) => {
    const now = new Date();
    const start = new Date(test.startTime);
    const end = new Date(test.endTime);

    if (test.attemptStatus !== 'NOT_STARTED') {
      if (test.attemptStatus === 'DISQUALIFIED') {
        return (
          <span className="flex items-center gap-1 text-xs text-red-400 font-bold border border-red-500/20 bg-red-500/10 px-2.5 py-1 rounded-full uppercase">
            <AlertTriangle size={12} /> Disqualified
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1 text-xs text-green-400 font-bold border border-green-500/20 bg-green-500/10 px-2.5 py-1 rounded-full uppercase">
          <CheckCircle size={12} /> Completed
        </span>
      );
    }

    if (now < start) {
      return (
        <span className="flex items-center gap-1 text-xs text-slate-400 font-bold border border-slate-800 bg-slate-900 px-2.5 py-1 rounded-full uppercase">
          <Lock size={12} /> Upcoming
        </span>
      );
    }

    if (now > end) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-500/80 font-bold border border-red-950/20 bg-red-950/20 px-2.5 py-1 rounded-full uppercase">
          Closed
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-xs text-indigo-400 font-bold border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase animate-pulse">
        Active
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-600/10 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/20">
          <BookOpen size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Monthly Platform Tests</h2>
          <p className="text-xs text-slate-400 mt-0.5">Participate in branch-specific challenges to compile state-wide ranks</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading monthly tests list...</div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => {
            const now = new Date();
            const start = new Date(test.startTime);
            const end = new Date(test.endTime);
            const isActive = now >= start && now <= end && test.attemptStatus === 'NOT_STARTED';

            return (
              <div key={test.id} className="glass p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700/80 transition shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-extrabold text-white text-lg tracking-tight">{test.title}</h3>
                    {getTestBadge(test)}
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={13} />
                    <span>
                      Window: {start.toLocaleString()} - {end.toLocaleString()}
                    </span>
                  </p>

                  <div className="flex gap-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={13} /> Duration: {test.durationMinutes} Mins</span>
                    <span className="text-indigo-400">Branch: {test.branch}</span>
                  </div>
                </div>

                <div className="md:text-right shrink-0">
                  {test.attemptStatus !== 'NOT_STARTED' && (
                    <div className="text-sm font-bold text-slate-300">
                      Score: <span className="text-indigo-400">{test.attemptScore !== null ? test.attemptScore : 'N/A'}</span>
                    </div>
                  )}

                  {isActive ? (
                    <button
                      onClick={() => handleStartTest(test.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition cursor-pointer"
                    >
                      Attempt Test
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-slate-900 border border-slate-800 text-slate-500 font-semibold px-5 py-2.5 rounded-xl text-sm"
                    >
                      {test.attemptStatus !== 'NOT_STARTED' ? 'Attempted' : now < start ? 'Locked' : 'Closed'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {tests.length === 0 && (
            <div className="glass p-12 rounded-2xl text-center border border-slate-800/80 text-slate-400">
              No tests currently active or scheduled for your branch.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
