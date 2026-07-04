import React, { useState, useEffect } from 'react';
import { Award, Search, Trophy, Landmark, EyeOff, AlertCircle } from 'lucide-react';

export default function LeaderboardPage({ user }) {
  const [completedTests, setCompletedTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [activeBranch, setActiveBranch] = useState('ALL');
  
  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Roll Number Search
  const [searchRollNo, setSearchRollNo] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Privacy setting
  const [showNamePublic, setShowNamePublic] = useState(user?.showNamePublic ?? true);

  // Fetch compiled tests list
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/leaderboard/completed-tests/list', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCompletedTests(data);
        if (data.length > 0) {
          setSelectedTestId(data[0].id);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch top 100 for test + branch
  const fetchLeaderboard = async () => {
    if (!selectedTestId) return;
    setLoading(true);
    setError('');
    setSearchResult(null); // Clear previous search
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`http://localhost:5000/api/leaderboard/${selectedTestId}?branch=${activeBranch}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load leaderboard data');
      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTestId, activeBranch]);

  // Search rank by roll number
  const handleSearchRollNo = async (e) => {
    e.preventDefault();
    if (!searchRollNo.trim() || !selectedTestId) return;
    
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`http://localhost:5000/api/leaderboard/${selectedTestId}/search?rollNo=${searchRollNo.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Roll number not found');
      }

      setSearchResult(data);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTogglePrivacy = async (checked) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/auth/privacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ showNamePublic: checked })
      });
      if (response.ok) {
        setShowNamePublic(checked);
        // Refresh local student user details stored
        const localUser = JSON.parse(localStorage.getItem('user'));
        localUser.showNamePublic = checked;
        localStorage.setItem('user', JSON.stringify(localUser));
        // Refresh table to update privacy rendering
        fetchLeaderboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const branchesList = ['ALL', 'CSE', 'ECE', 'MECH', 'CIVIL'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-indigo-600 text-white p-2.5 rounded-xl border border-indigo-500/20">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">State Leaderboard</h2>
            <p className="text-xs text-slate-400 mt-0.5">Top 100 students ranked across colleges and branches</p>
          </div>
        </div>

        {/* Selected Test Dropdown */}
        <div>
          <select
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 max-w-xs"
          >
            {completedTests.map(t => (
              <option key={t.id} value={t.id}>{t.title} (June)</option>
            ))}
            {completedTests.length === 0 && (
              <option value="">No published results</option>
            )}
          </select>
        </div>
      </div>

      {/* Roll Number Search Card (Top Requirement) */}
      <div className="glass p-6 rounded-2xl border border-slate-800 shadow-md">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Search size={16} className="text-indigo-400" />
          <span>Look Up Rank by Roll Number</span>
        </h3>
        
        <form onSubmit={handleSearchRollNo} className="flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="Enter Student Roll Number (e.g. CSE025)"
            required
            value={searchRollNo}
            onChange={(e) => setSearchRollNo(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Results Display */}
        {searchResult && (
          <div className="mt-4 bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl flex items-center justify-between gap-4 animate-fadeIn">
            <div>
              <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider mb-0.5">Roll Number Search Match</div>
              <h4 className="font-bold text-white text-base">{searchResult.studentName}</h4>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Landmark size={12} />
                <span>{searchResult.instituteName} &bull; {searchResult.branch}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">State Rank</div>
              <div className="text-2xl font-black text-indigo-400">#{searchResult.rank}</div>
              <div className="text-[10px] text-slate-400">Score: {searchResult.score} pts</div>
            </div>
          </div>
        )}

        {searchError && (
          <div className="mt-4 bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* User Name Privacy Toggle (Only for Students) */}
      {user?.role === 'STUDENT' && (
        <div className="glass px-6 py-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <EyeOff size={14} className="text-slate-500" />
            <span>Leaderboard Privacy: Hide your real name on public boards (displays as "Anonymous")</span>
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!showNamePublic}
              onChange={(e) => handleTogglePrivacy(!e.target.checked)}
            />
            <div className="w-9 h-5 bg-slate-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
          </label>
        </div>
      )}

      {/* Branch Navigation Tabs */}
      <div className="border-b border-slate-900 flex gap-2 shrink-0">
        {branchesList.map(br => (
          <button
            key={br}
            onClick={() => setActiveBranch(br)}
            className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeBranch === br
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {br === 'ALL' ? 'State Wide' : br}
          </button>
        ))}
      </div>

      {/* Leaderboard Table (Top 100 list) */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Fetching leaderboard rankings...</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6 text-center w-16">Rank</th>
                  <th className="py-4 px-6">Student</th>
                  <th className="py-4 px-6">Roll No</th>
                  <th className="py-4 px-6">Institute</th>
                  <th className="py-4 px-6 text-right pr-8">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50 text-xs text-slate-300">
                {leaderboard.map((entry, idx) => {
                  const isTop3 = entry.rank <= 3;
                  const isSelf = user && entry.studentId === user.id;

                  return (
                    <tr 
                      key={entry.id}
                      className={`transition ${isSelf ? 'bg-indigo-950/20 text-white font-semibold' : 'hover:bg-slate-900/20'}`}
                    >
                      <td className="py-4 px-6 text-center font-bold">
                        {isTop3 ? (
                          <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-extrabold ${
                            entry.rank === 1 ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-500/20' :
                            entry.rank === 2 ? 'bg-slate-300 text-slate-950 shadow' :
                            'bg-amber-700 text-white shadow-sm'
                          }`}>
                            {entry.rank}
                          </span>
                        ) : (
                          <span>{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-100 flex items-center gap-2">
                        {entry.studentName}
                        {isSelf && (
                          <span className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-mono">{entry.rollNo}</td>
                      <td className="py-4 px-6 text-slate-400">{entry.instituteName}</td>
                      <td className="py-4 px-6 text-right pr-8 font-extrabold text-indigo-400">
                        {entry.score} pts
                      </td>
                    </tr>
                  );
                })}

                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                      No student results published for this category yet.
                    </td>
                  </tr>
                )}
                {leaderboard.length === 100 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[10px] text-slate-500 font-medium bg-slate-900/10 border-t border-slate-900">
                      Showing top 100 students. Enter roll number above to check ranks outside top 100.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
