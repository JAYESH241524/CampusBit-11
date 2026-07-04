import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Filter, Calendar, ExternalLink, Trash2, Edit3, Send, Check } from 'lucide-react';

export default function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Filtering
  const [categoryFilter, setCategoryFilter] = useState('');
  const [instFilter, setInstFilter] = useState('');
  const [institutes, setInstitutes] = useState([]);
  
  // Comment modal
  const [activePost, setActivePost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');

  // Fetch approved institutes for filter dropdown
  useEffect(() => {
    fetch('http://localhost:5000/api/auth/approved-institutes')
      .then(res => res.json())
      .then(data => setInstitutes(data))
      .catch(err => console.error(err));
  }, []);

  // Fetch feed items
  const fetchFeed = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const targetPage = reset ? 1 : page;
    const token = localStorage.getItem('token');

    let url = `http://localhost:5000/api/events?page=${targetPage}&limit=4`;
    if (categoryFilter) url += `&category=${categoryFilter}`;
    if (instFilter) url += `&instituteId=${instFilter}`;

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (reset) {
        setPosts(data.events || []);
        setPage(2);
      } else {
        setPosts(prev => [...prev, ...(data.events || [])]);
        setPage(prev => prev + 1);
      }
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    fetchFeed(true);
  }, [categoryFilter, instFilter]);

  const handleLike = async (postId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/events/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      // Update local state
      setPosts(prev =>
        prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              hasLiked: data.liked,
              likeCount: data.liked ? post.likeCount + 1 : post.likeCount - 1
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const openComments = async (post) => {
    setActivePost(post);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/events/${post.id}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setComments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/events/${activePost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentText })
      });
      const newComment = await response.json();

      setComments(prev => [...prev, newComment]);
      setCommentText('');
      
      // Update comment count in local posts state
      setPosts(prev =>
        prev.map(post => {
          if (post.id === activePost.id) {
            return { ...post, commentCount: post.commentCount + 1 };
          }
          return post;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const deleteComment = async (commentId) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:5000/api/events/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setComments(prev => prev.filter(c => c.id !== commentId));
      setPosts(prev =>
        prev.map(post => {
          if (post.id === activePost.id) {
            return { ...post, commentCount: Math.max(0, post.commentCount - 1) };
          }
          return post;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.commentText);
  };

  const saveEditComment = async (commentId) => {
    if (!editText.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/events/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentText: editText })
      });
      const updated = await response.json();

      setComments(prev => prev.map(c => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      
      {/* Filter Bar */}
      <div className="glass p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Filter size={16} />
          <span>Filters</span>
        </div>

        <div className="flex flex-1 flex-wrap gap-2 justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="Hackathon">Hackathons</option>
            <option value="Workshop">Workshops</option>
            <option value="Seminar">Seminars</option>
            <option value="Pitch">Pitch Contests</option>
            <option value="Placement">Placements</option>
          </select>

          <select
            value={instFilter}
            onChange={(e) => setInstFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 outline-none focus:border-indigo-500 max-w-[150px] truncate"
          >
            <option value="">All Campuses</option>
            {institutes.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feed Cards */}
      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="glass rounded-2xl overflow-hidden border border-slate-800/80 shadow-xl transition-all duration-300 hover:shadow-indigo-500/5">
            
            {/* Card Header (Profile handle style) */}
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm uppercase shadow">
                {post.instituteName.slice(0, 2)}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">{post.instituteName}</h4>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Calendar size={10} />
                  <span>{new Date(post.eventDate).toLocaleDateString()}</span>
                </p>
              </div>
              <span className="ml-auto text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 py-1 px-2.5 rounded-full font-bold uppercase tracking-wider">
                {post.category}
              </span>
            </div>

            {/* Banner Image */}
            <div className="relative aspect-video bg-slate-900 overflow-hidden">
              <img
                src={post.bannerUrl}
                alt={post.title}
                className="w-full h-full object-cover transition duration-500 hover:scale-105"
              />
            </div>

            {/* Actions Bar */}
            <div className="p-4 flex items-center gap-4 text-slate-300 border-b border-slate-900/60">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 transition hover:text-red-500 cursor-pointer ${post.hasLiked ? 'text-red-500 fill-red-500' : ''}`}
              >
                <Heart size={20} />
                <span className="text-xs font-bold">{post.likeCount}</span>
              </button>

              <button
                onClick={() => openComments(post)}
                className="flex items-center gap-1.5 transition hover:text-indigo-400 cursor-pointer"
              >
                <MessageCircle size={20} />
                <span className="text-xs font-bold">{post.commentCount}</span>
              </button>

              {post.registrationLink && (
                <a
                  href={post.registrationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-indigo-400 font-bold hover:underline"
                >
                  <span>Register</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {/* Caption Section */}
            <div className="p-4 space-y-1.5 text-sm">
              <p className="font-extrabold text-white text-base leading-tight">{post.title}</p>
              <p className="text-slate-400 font-light leading-relaxed">{post.description}</p>
              <p className="text-[10px] text-slate-600 pt-1">
                Posted {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>

          </div>
        ))}

        {/* Infinite Scroll / Loading Button */}
        {hasMore && (
          <button
            onClick={() => fetchFeed()}
            disabled={loading}
            className="w-full glass py-3 rounded-xl border border-slate-800/80 hover:border-slate-700/80 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Loading Feed...' : 'Show More Posts'}
          </button>
        )}

        {!hasMore && posts.length > 0 && (
          <p className="text-center text-xs text-slate-600 font-medium py-4">You have caught up with all events</p>
        )}

        {posts.length === 0 && !loading && (
          <div className="glass p-12 rounded-2xl text-center border border-slate-800/80">
            <p className="text-slate-400 font-semibold">No events found matching filters</p>
          </div>
        )}
      </div>

      {/* Instagram Comments Detail Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-800">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-900 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Comments</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{activePost.title}</p>
              </div>
              <button
                onClick={() => setActivePost(null)}
                className="text-slate-400 hover:text-white transition font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">Be the first to share your thoughts!</p>
              )}
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 text-sm group">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                    {comment.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-900">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs text-indigo-400">{comment.studentName}</span>
                      <span className="text-[10px] text-slate-600">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="flex gap-2 mt-1.5">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                        />
                        <button
                          onClick={() => saveEditComment(comment.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded p-1 text-xs"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-slate-300 text-xs leading-relaxed font-light">{comment.commentText}</p>
                    )}
                  </div>

                  {/* Actions for moderation or editing */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 transition-opacity duration-150">
                    {comment.studentId === user.id && editingCommentId !== comment.id && (
                      <button
                        onClick={() => startEditComment(comment)}
                        className="text-slate-500 hover:text-indigo-400 p-1 transition"
                        title="Edit Comment"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                    {(comment.studentId === user.id || (user.role === 'INSTITUTE_ADMIN' && activePost.instituteId === user.instituteId)) && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition"
                        title="Delete Comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Comments Input (For Students Only) */}
            {user.role === 'STUDENT' ? (
              <form onSubmit={postComment} className="p-4 border-t border-slate-900 bg-slate-950/40 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none placeholder-slate-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl flex items-center justify-center transition cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div className="p-3 text-center bg-slate-950/60 text-[10px] text-slate-500 border-t border-slate-900 font-semibold uppercase tracking-wider">
                Only students can submit text comments
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
