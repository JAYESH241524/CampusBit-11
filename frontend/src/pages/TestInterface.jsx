import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, AlertTriangle, AlertOctagon, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, Eye, CornerDownRight } from 'lucide-react';

export default function TestInterface({ user }) {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [markedForReview, setMarkedForReview] = useState({}); // { questionId: boolean }

  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Warning Modals
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [disqualified, setDisqualified] = useState(false);

  // Prevent multiple socket triggers
  const tabSwitchRegistered = useRef(false);

  // Fetch attempt and questions on load
  const loadTest = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${testId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start test');
      }

      setAttempt(data.attempt);
      setQuestions(data.questions);

      // Parse existing answers
      const parsedAns = JSON.parse(data.attempt.answers || '{}');
      setAnswers(parsedAns);

      // Setup initial timer
      // Max remaining time: attempt.createdAt + durationMinutes - now
      const durationMs = 60 * 1000 * 60; // fallback to 60 mins if not found
      const testDurationMinutes = 60; // active test duration is 60 in seed
      
      const attemptStart = new Date(data.attempt.createdAt).getTime();
      const testEnd = attemptStart + testDurationMinutes * 60 * 1000;
      const initialSeconds = Math.max(0, Math.floor((testEnd - Date.now()) / 1000));
      setTimeLeft(initialSeconds);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadTest();
  }, [testId]);

  // Timer Tick
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleAutoSubmit('TIMEOUT');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Periodic Auto-Save every 15 seconds
  useEffect(() => {
    if (!attempt || disqualified || submitting) return;

    const autoSaveTimer = setInterval(() => {
      saveAnswersToServer();
    }, 15000);

    return () => clearInterval(autoSaveTimer);
  }, [answers, attempt, disqualified, submitting]);

  const saveAnswersToServer = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:5000/api/tests/${testId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
    } catch (err) {
      console.error('Auto-save error:', err);
    }
  };

  // Tab switch logs, trigger warning or disqualification
  const registerTabSwitch = async () => {
    if (submitting || disqualified) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${testId}/tab-switch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.disqualified) {
        setDisqualified(true);
        // Clean event listeners
        removeAntiCheatListeners();
      } else {
        setShowWarningModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // VisibilityChange and Blur detection
  useEffect(() => {
    if (!attempt || disqualified || submitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Visibility hidden detected');
        registerTabSwitch();
      }
    };

    const handleBlur = () => {
      console.log('Window blur detected');
      registerTabSwitch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Disable copy paste, right click, hotkeys
    const preventContextMenu = (e) => e.preventDefault();
    const preventCopyPaste = (e) => e.preventDefault();
    const preventKeys = (e) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85)
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('keydown', preventKeys);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('keydown', preventKeys);
    };
  }, [attempt, disqualified, submitting]);

  const removeAntiCheatListeners = () => {
    // A clean helper to avoid extra logs after submitting
  };

  const handleSelectOption = (qId, optionIdx) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [qId]: optionIdx };
      // Save instantly on change for premium feel
      return newAnswers;
    });
  };

  const handleMarkReview = (qId) => {
    setMarkedForReview(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleAutoSubmit = async (reason = 'DISQUALIFIED') => {
    if (submitting) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:5000/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
      navigate('/tests', { replace: true });
    }
  };

  const submitTestForm = async () => {
    if (submitting) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
      if (response.ok) {
        navigate('/tests');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Formatter for timer
  const formatTime = (seconds) => {
    if (seconds === null) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="glass max-w-md mx-auto p-8 rounded-2xl border border-slate-800 text-center my-12">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Test Unavailable</h3>
        <p className="text-slate-400 text-sm">{error}</p>
        <button onClick={() => navigate('/tests')} className="mt-6 bg-slate-900 border border-slate-800 hover:border-indigo-500 py-2 px-6 rounded-lg text-xs transition">
          Back to List
        </button>
      </div>
    );
  }

  if (!attempt || questions.length === 0) {
    return <div className="text-center py-12 text-slate-500">Loading exam environment...</div>;
  }

  const activeQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="h-[82vh] flex flex-col gap-4 relative">
      
      {/* Top Test Header: Title, answered metrics, countdown timer */}
      <div className="glass px-6 py-3 rounded-2xl border border-slate-800 flex items-center justify-between shadow-md shrink-0">
        <div>
          <h2 className="font-extrabold text-white text-base leading-snug tracking-tight">{attempt.testTitle || 'State Challenge'}</h2>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider flex gap-4">
            <span>Branch: {user.branch}</span>
            <span>Progress: {answeredCount} / {questions.length} Answered</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 px-4 py-2 rounded-xl text-sm font-bold shadow-inner">
            <Timer size={16} className="animate-pulse" />
            <span className="font-mono tracking-wider">{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={submitTestForm}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow hover:shadow-indigo-500/10 transition cursor-pointer"
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* LeetCode Split Pane Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
        
        {/* Left Pane: Question Viewer & Navigation */}
        <div className="flex-1 glass rounded-2xl border border-slate-800/80 p-6 flex flex-col min-h-0">
          
          {/* Question Navigator Drawer */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 font-black px-3 py-1 rounded-lg text-xs">
                Q {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">({activeQuestion.marks} Points)</span>
            </div>
            
            <div className="flex gap-1.5">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 hover:border-indigo-500/50 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentIdx === questions.length - 1}
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 hover:border-indigo-500/50 transition cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Question Text */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4">
            <p className="text-slate-200 text-base leading-relaxed font-normal whitespace-pre-wrap">
              {activeQuestion.questionText}
            </p>

            {/* Simulated Code Editor Preview if Coding Question */}
            {activeQuestion.questionType === 'CODING' && (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50 font-mono text-xs text-slate-400 p-4 leading-relaxed mt-4 shadow-inner">
                <span className="text-indigo-400 font-bold"># Python 3 code template</span><br/>
                <span>def solve(nums):</span><br/>
                <span>&nbsp;&nbsp;&nbsp;&nbsp;# Write your code logic here</span><br/>
                <span>&nbsp;&nbsp;&nbsp;&nbsp;pass</span>
              </div>
            )}
          </div>

          {/* Sidebar / Bottom Grid Navigator */}
          <div className="pt-4 border-t border-slate-900 flex items-center justify-between shrink-0">
            <div className="flex flex-wrap gap-2.5">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isReview = markedForReview[q.id];
                let btnClass = "bg-slate-900 border-slate-800 text-slate-400";
                if (idx === currentIdx) {
                  btnClass = "border-indigo-500 bg-indigo-600/10 text-indigo-400 font-bold ring-1 ring-indigo-500/30";
                } else if (isReview) {
                  btnClass = "border-amber-500 bg-amber-600/10 text-amber-400 font-bold";
                } else if (isAnswered) {
                  btnClass = "border-green-500 bg-green-600/10 text-green-400 font-bold";
                }
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-8 h-8 rounded-lg border text-xs transition duration-150 flex items-center justify-center cursor-pointer ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Pane: Answers Inputs */}
        <div className="w-full md:w-[420px] glass rounded-2xl border border-slate-800/80 p-6 flex flex-col shrink-0 min-h-0">
          <div className="pb-4 border-b border-slate-900 shrink-0">
            <h3 className="font-bold text-sm text-slate-300">Submit Your Answer</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Progress is saved automatically every 15s</p>
          </div>

          {/* Options List */}
          <div className="flex-1 overflow-y-auto py-6 space-y-3">
            {activeQuestion.options.map((option, oIdx) => {
              const isSelected = answers[activeQuestion.id] === oIdx;
              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(activeQuestion.id, oIdx)}
                  className={`w-full text-left p-4 rounded-xl border text-xs transition duration-150 cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 text-white font-bold ring-1 ring-indigo-500/20'
                      : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-extrabold ${
                    isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-500'
                  }`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Option Review toggle */}
          <div className="pt-4 border-t border-slate-900 shrink-0 flex items-center justify-between">
            <button
              onClick={() => handleMarkReview(activeQuestion.id)}
              className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                markedForReview[activeQuestion.id]
                  ? 'border-amber-500 text-amber-400 bg-amber-600/10'
                  : 'border-slate-800 text-slate-400 hover:border-slate-700 bg-slate-900'
              }`}
            >
              <Eye size={14} />
              <span>{markedForReview[activeQuestion.id] ? 'Review Marked' : 'Mark for Review'}</span>
            </button>
            
            <button
              onClick={() => {
                if (currentIdx < questions.length - 1) {
                  setCurrentIdx(prev => prev + 1);
                } else {
                  saveAnswersToServer();
                }
              }}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
            >
              {currentIdx < questions.length - 1 ? 'Save & Next' : 'Auto Save Answers'}
            </button>
          </div>

        </div>

      </div>

      {/* Warning Modal (Tab Switch #1 Warning) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass max-w-sm w-full p-6 rounded-2xl shadow-2xl border border-red-500/20 text-center animate-bounce">
            <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">Tab Switch Warning</h3>
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              You clicked away or changed tabs. <strong>1 more tab switch</strong> will immediately disqualify you and auto-submit your exam attempt.
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition cursor-pointer text-xs"
            >
              I Understand (Return to Test)
            </button>
          </div>
        </div>
      )}

      {/* Disqualified Modal (Tab Switch #2 - Auto submit) */}
      {disqualified && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur flex items-center justify-center p-4">
          <div className="glass max-w-sm w-full p-8 rounded-2xl shadow-2xl border border-red-500 text-center">
            <AlertOctagon className="mx-auto text-red-500 mb-4 animate-pulse" size={56} />
            <h3 className="text-2xl font-black text-white mb-2">Test Disqualified</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              You exceeded the limit of 2 tab-switches. Your exam attempt has been auto-submitted with a status flag of <strong>DISQUALIFIED</strong>.
            </p>
            <button
              onClick={() => handleAutoSubmit('DISQUALIFIED')}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs uppercase tracking-wider"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
