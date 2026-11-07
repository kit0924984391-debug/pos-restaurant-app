'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TypedLink } from '@/lib/router';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronUp,
  MessageSquare,
  Eye,
  Pin,
  Lock,
  Share2,
  Flag,
  Send,
  Loader2,
  Trash2,
  ShieldCheck,
  CheckCircle,
  CornerDownRight,
  Sparkles,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { UserRoleBadge, FeatureStatusBadge } from '@/components/board/Badge';
import AuthModal from '@/components/board/AuthModal';

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [thread, setThread] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comment input state
  const [commentBody, setCommentBody] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Auth modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState({ title: '', subtitle: '' });

  // Report modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ threadId?: string; commentId?: string }>({});

  // Share feedback
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchThreadDetail();
    }
  }, [id]);

  async function fetchThreadDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/board/threads/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถโหลดกระทู้ได้');

      setThread(data.thread);
      setComments(data.comments || []);
      setCurrentUser(data.currentUser);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpvote() {
    if (!thread) return;

    try {
      const res = await fetch('/api/board/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, type: 'UPVOTE' }),
      });

      if (res.status === 401) {
        setAuthModalMessage({
          title: 'เข้าสู่ระบบเพื่อโหวต',
          subtitle: 'เข้าสู่ระบบเพื่อร่วมโหวตฟีเจอร์นี้',
        });
        setAuthModalOpen(true);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setThread((prev: any) => ({
          ...prev,
          reactionsCount: data.reactionsCount,
          hasReacted: data.hasReacted,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;

    if (!currentUser) {
      setAuthModalMessage({
        title: 'เข้าสู่ระบบเพื่อแสดงความคิดเห็น',
        subtitle: 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถร่วมสนทนาได้',
      });
      setAuthModalOpen(true);
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/board/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          body: commentBody.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถส่งคอมเมนต์ได้');

      setComments((prev) => [...prev, data.comment]);
      setCommentBody('');
      setThread((prev: any) => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleReplySubmit(parentId: string) {
    if (!replyBody.trim()) return;

    if (!currentUser) {
      setAuthModalMessage({
        title: 'เข้าสู่ระบบเพื่อตอบกลับ',
        subtitle: 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถตอบกลับได้',
      });
      setAuthModalOpen(true);
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/board/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          parentId,
          body: replyBody.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถส่งคำตอบได้');

      setComments((prev) => [...prev, data.comment]);
      setReplyBody('');
      setReplyingToId(null);
      setThread((prev: any) => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleCommentLike(commentId: string) {
    try {
      const res = await fetch('/api/board/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, type: 'LIKE' }),
      });

      if (res.status === 401) {
        setAuthModalMessage({
          title: 'เข้าสู่ระบบเพื่อถูกใจ',
          subtitle: 'คุณต้องเข้าสู่ระบบก่อนเพื่อกดถูกใจคอมเมนต์',
        });
        setAuthModalOpen(true);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  reactionsCount: data.reactionsCount,
                  hasReacted: data.hasReacted,
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAdminAction(action: string, value?: any) {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') return;

    const payload: any = {};
    if (action === 'TOGGLE_PIN') payload.isPinned = !thread.isPinned;
    if (action === 'TOGGLE_LOCK') payload.isLocked = !thread.isLocked;
    if (action === 'SET_FEATURE_STATUS') payload.featureStatus = value;

    try {
      const res = await fetch(`/api/board/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setThread((prev: any) => ({
          ...prev,
          ...data.thread,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteThread() {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้?')) return;

    try {
      const res = await fetch(`/api/board/threads/${thread.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/board');
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setSubmittingReport(true);
    try {
      const res = await fetch('/api/board/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reportTarget,
          reason: reportReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('ส่งรายงานเรียบร้อยแล้ว');
        setReportModalOpen(false);
        setReportReason('');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingReport(false);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs text-slate-400">กำลังโหลดข้อมูลกระทู้...</p>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">ไม่พบกระทู้นี้</h3>
        <p className="text-xs text-slate-400">{error || 'กระทู้อาจถูกลบไปแล้ว'}</p>
        <TypedLink
          to="/board"
          preload="intent"
          className="inline-flex items-center space-x-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้ารวมกระทู้</span>
        </TypedLink>
      </div>
    );
  }

  // Separate top-level comments and child comments
  const parentComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAuthor = currentUser?.id === thread.author.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <TypedLink
          to="/board"
          preload="intent"
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปยังรายการกระทู้ทั้งหมด</span>
        </TypedLink>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'คัดลอกลิงก์แล้ว! ✅' : 'แชร์กระทู้'}</span>
        </button>
      </div>

      {/* Thread Main Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header Badges & Category */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {thread.category && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                {thread.category.name}
              </span>
            )}
            <FeatureStatusBadge status={thread.featureStatus} />
            {thread.isPinned && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span>ปักหมุด</span>
              </span>
            )}
            {thread.isLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-800 text-slate-400 border border-slate-700">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>ล็อกแล้ว</span>
              </span>
            )}
          </div>

          {/* Admin Bar */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleAdminAction('TOGGLE_PIN')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                  thread.isPinned ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
                title="ปักหมุดกระทู้"
              >
                📌 {thread.isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
              </button>
              <button
                type="button"
                onClick={() => handleAdminAction('TOGGLE_LOCK')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                  thread.isLocked ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
                }`}
                title="ล็อกกระทู้ ไม่ให้คอมเมนต์เพิ่ม"
              >
                🔒 {thread.isLocked ? 'ปลดล็อก' : 'ล็อกกระทู้'}
              </button>
              {/* Change Feature Status */}
              <select
                value={thread.featureStatus || ''}
                onChange={(e) => handleAdminAction('SET_FEATURE_STATUS', e.target.value || null)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-orange-400 focus:outline-none"
              >
                <option value="">-- สถานะฟีเจอร์ --</option>
                <option value="UNDER_REVIEW">📋 รับเรื่องแล้ว</option>
                <option value="IN_PROGRESS">⚙️ กำลังพัฒนา</option>
                <option value="COMPLETED">✅ เปิดใช้งานแล้ว</option>
                <option value="DECLINED">❌ ปิดการพิจารณา</option>
              </select>
            </div>
          )}
        </div>

        {/* Thread Title */}
        <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
          {thread.title}
        </h1>

        {/* Author & Meta */}
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm">{thread.author.name}</span>
            <UserRoleBadge role={thread.author.role} storeName={thread.author.storeName} />
          </div>
          <span>•</span>
          <span>
            {new Date(thread.createdAt).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <div className="ml-auto flex items-center space-x-3 text-slate-500">
            <span className="flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{thread.viewsCount} ครั้ง</span>
            </span>
          </div>
        </div>

        {/* Thread Body */}
        <div className="text-sm sm:text-base text-slate-200 whitespace-pre-wrap leading-relaxed">
          {thread.body}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {/* Big Upvote Button */}
          <button
            type="button"
            onClick={handleUpvote}
            className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
              thread.hasReacted
                ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-black'
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:text-orange-400 font-bold'
            }`}
          >
            <ChevronUp
              className={`w-5 h-5 ${thread.hasReacted ? 'scale-125 text-orange-400' : ''}`}
            />
            <span>โหวตฟีเจอร์นี้ ({thread.reactionsCount || 0})</span>
          </button>

          {/* Delete or Report */}
          <div className="flex items-center space-x-2">
            {(isAdmin || isAuthor) && (
              <button
                type="button"
                onClick={handleDeleteThread}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700/60 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                title="ลบกระทู้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  setAuthModalMessage({
                    title: 'เข้าสู่ระบบเพื่อรายงาน',
                    subtitle: 'คุณต้องเข้าสู่ระบบก่อนรายงานเนื้อหา',
                  });
                  setAuthModalOpen(true);
                  return;
                }
                setReportTarget({ threadId: thread.id });
                setReportModalOpen(true);
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
              title="รายงานเนื้อหาไม่เหมาะสม"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            <span>ความคิดเห็น ({thread.commentsCount || comments.length})</span>
          </h2>
        </div>

        {/* Comment Input Box */}
        {thread.isLocked ? (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>กระทู้นี้ถูกล็อกแล้ว ไม่สามารถแสดงความคิดเห็นเพิ่มเติมได้</span>
          </div>
        ) : currentUser ? (
          <form onSubmit={handleCommentSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="ร่วมแสดงความคิดเห็น แนะนำ หรือให้กำลังใจเจ้าของร้านได้ที่นี่..."
              rows={3}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                โพสต์ในนาม: <strong className="text-slate-300">{currentUser.name}</strong>
              </span>
              <button
                type="submit"
                disabled={submittingComment || !commentBody.trim()}
                className="py-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-40 text-white font-black text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                {submittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>ส่งความคิดเห็น</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-orange-950/20 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <h4 className="text-sm font-bold text-white">ต้องการร่วมแสดงความคิดเห็นหรือเสนอแนะ?</h4>
              <p className="text-xs text-slate-400 mt-0.5">เข้าสู่ระบบหรือสมัครเปิดร้านเพื่อพูดคุยแลกเปลี่ยนได้ทันที</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthModalMessage({
                  title: 'เข้าสู่ระบบเพื่อแสดงความคิดเห็น',
                  subtitle: 'เข้าสู่ระบบเพื่อร่วมคอมเมนต์ในกระทู้นี้',
                });
                setAuthModalOpen(true);
              }}
              className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-orange-500/25 shrink-0 transition-all cursor-pointer"
            >
              เข้าสู่ระบบเพื่อคอมเมนต์
            </button>
          </div>
        )}

        {/* Comments List */}
        {parentComments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            ยังไม่มีความคิดเห็นในกระทู้นี้ เป็นคนแรกที่เริ่มพูดคุยได้เลย!
          </div>
        ) : (
          <div className="space-y-3">
            {parentComments.map((comment) => {
              const replies = getReplies(comment.id);
              const isReplying = replyingToId === comment.id;

              return (
                <div key={comment.id} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  {/* Comment Author & Date */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{comment.author.name}</span>
                      <UserRoleBadge role={comment.author.role} storeName={comment.author.storeName} />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(comment.createdAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Comment Body */}
                  <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed pl-1">
                    {comment.body}
                  </div>

                  {/* Comment Actions */}
                  <div className="flex items-center space-x-3 text-xs pt-1 border-t border-slate-800/40">
                    <button
                      type="button"
                      onClick={() => handleCommentLike(comment.id)}
                      className={`flex items-center space-x-1 py-1 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        comment.hasReacted
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      <span>❤️</span>
                      <span>{comment.reactionsCount || 0}</span>
                    </button>

                    {!thread.isLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(isReplying ? null : comment.id);
                          setReplyBody('');
                        }}
                        className="text-slate-400 hover:text-white font-bold transition-colors cursor-pointer py-1 px-2"
                      >
                        {isReplying ? 'ยกเลิกตอบกลับ' : 'ตอบกลับ'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          setAuthModalMessage({
                            title: 'เข้าสู่ระบบเพื่อรายงาน',
                            subtitle: 'คุณต้องเข้าสู่ระบบก่อนรายงานเนื้อหา',
                          });
                          setAuthModalOpen(true);
                          return;
                        }
                        setReportTarget({ commentId: comment.id });
                        setReportModalOpen(true);
                      }}
                      className="ml-auto text-slate-500 hover:text-slate-400 p-1"
                      title="รายงานคอมเมนต์นี้"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Nested Reply Form */}
                  {isReplying && (
                    <div className="pt-2 pl-4 border-l-2 border-orange-500/40 space-y-2 animate-fade-in">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={`ตอบกลับความคิดเห็นของคุณ ${comment.author.name}...`}
                        rows={2}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="py-1 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-white"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={submittingComment || !replyBody.trim()}
                          className="py-1 px-3.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs disabled:opacity-40"
                        >
                          ส่งคำตอบ
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nested Replies List */}
                  {replies.length > 0 && (
                    <div className="pt-2 pl-4 border-l-2 border-slate-800 space-y-2.5">
                      {replies.map((reply) => (
                        <div key={reply.id} className="bg-slate-950/60 rounded-xl p-3 space-y-1.5 border border-slate-800/60">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1.5">
                              <CornerDownRight className="w-3 h-3 text-orange-400" />
                              <span className="font-bold text-white">{reply.author.name}</span>
                              <UserRoleBadge role={reply.author.role} storeName={reply.author.storeName} />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(reply.createdAt).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 pl-4">{reply.body}</p>
                          <div className="flex items-center space-x-2 pl-4 pt-1">
                            <button
                              type="button"
                              onClick={() => handleCommentLike(reply.id)}
                              className={`flex items-center space-x-1 py-0.5 px-2 rounded border text-[10px] font-bold ${
                                reply.hasReacted
                                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span>❤️</span>
                              <span>{reply.reactionsCount || 0}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 text-left shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center space-x-2">
              <Flag className="w-4 h-4 text-rose-400" />
              <span>รายงานเนื้อหาไม่เหมาะสม</span>
            </h3>
            <p className="text-xs text-slate-400">
              โปรดระบุเหตุผลที่รายงานเนื้อหานี้ เพื่อให้ทีมงานตรวจสอบ
            </p>
            <form onSubmit={handleSubmitReport} className="space-y-3">
              <textarea
                required
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="เช่น มีคำหยาบคาย, ข้อมูลเท็จ, สแปมขายของ ฯลฯ"
                rows={3}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="py-1.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || !reportReason.trim()}
                  className="py-1.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/25"
                >
                  {submittingReport ? 'กำลังส่ง...' : 'ส่งรายงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
          fetchThreadDetail();
        }}
        title={authModalMessage.title}
        subtitle={authModalMessage.subtitle}
      />
    </div>
  );
}
