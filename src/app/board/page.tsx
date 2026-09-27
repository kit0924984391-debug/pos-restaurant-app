'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronUp,
  MessageSquare,
  Eye,
  Pin,
  Lock,
  Search,
  Filter,
  Flame,
  Clock,
  Sparkles,
  Loader2,
  PlusCircle,
  Lightbulb,
  Bug,
  Megaphone,
} from 'lucide-react';
import { UserRoleBadge, FeatureStatusBadge } from '@/components/board/Badge';
import AuthModal from '@/components/board/AuthModal';

export default function BoardHomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'top'>('top');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState({ title: '', subtitle: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [selectedCategory, sortBy, page]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/board/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }

  async function fetchThreads() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        category: selectedCategory,
        sort: sortBy,
        page: page.toString(),
        limit: '15',
      });
      if (searchQuery.trim()) {
        queryParams.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/board/threads?${queryParams.toString()}`);
      const data = await res.json();
      if (data.threads) {
        setThreads(data.threads);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchThreads();
  }

  async function handleUpvote(threadId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch('/api/board/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, type: 'UPVOTE' }),
      });

      if (res.status === 401) {
        setAuthModalMessage({
          title: 'เข้าสู่ระบบเพื่อโหวต',
          subtitle: 'ร่วมเป็นส่วนหนึ่งในการโหวตฟีเจอร์ที่อยากให้มีในระบบ Order Pos',
        });
        setAuthModalOpen(true);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  reactionsCount: data.reactionsCount,
                  hasReacted: data.hasReacted,
                }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Error toggling upvote:', err);
    }
  }

  const categoryIcons: Record<string, any> = {
    suggestion: Lightbulb,
    community: MessageSquare,
    feedback: Bug,
    announcement: Megaphone,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner for Board */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-400 border border-orange-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Order Pos Community &amp; Roadmap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ชุมชนพูดคุย &amp; โหวตฟีเจอร์ใหม่
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            พื้นที่สำหรับเจ้าของร้านอาหารตามสั่ง ร่วมแชร์เทคนิคการทำร้าน ติชมการใช้งาน และโหวตฟีเจอร์ที่คุณอยากให้เราพัฒนาขึ้นในระบบถัดไป
          </p>
        </div>
      </div>

      {/* Categories Bar & Search */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            ทั้งหมด
          </button>

          {categories.map((cat) => {
            const Icon = categoryIcons[cat.slug] || MessageSquare;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
                {cat._count?.threads > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      selectedCategory === cat.slug
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat._count.threads}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหากระทู้..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </form>

          {/* Sort Switcher */}
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setSortBy('top')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
                sortBy === 'top'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="เรียงตามยอดโหวตสูงสุด"
            >
              <Flame className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">โหวตสูงสุด</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
                sortBy === 'recent'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="เรียงตามกระทู้ล่าสุด"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ล่าสุด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Threads List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-xs text-slate-400">กำลังโหลดรายการกระทู้...</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">ยังไม่มีกระทู้ในหมวดหมู่นี้</h3>
            <p className="text-xs text-slate-400 mt-1">
              เป็นคนแรกที่เปิดประเด็น หรือเสนอแนะฟีเจอร์ใหม่ให้กับร้านค้าของคุณได้เลย!
            </p>
          </div>
          <Link
            href="/board/new"
            className="inline-flex items-center space-x-2 py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เริ่มตั้งกระทู้แรก</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`group relative bg-slate-900/80 hover:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all duration-150 flex items-start gap-3 sm:gap-4 shadow-sm ${
                thread.isPinned
                  ? 'border-orange-500/40 bg-orange-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Upvote Button Column */}
              <button
                type="button"
                onClick={(e) => handleUpvote(thread.id, e)}
                className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[54px] py-2 px-1 rounded-xl border transition-all cursor-pointer select-none active:scale-90 ${
                  thread.hasReacted
                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-orange-400'
                }`}
                title="กดโหวตกระทู้นี้"
              >
                <ChevronUp
                  className={`w-5 h-5 transition-transform ${
                    thread.hasReacted ? 'scale-125 text-orange-400' : 'group-hover:-translate-y-0.5'
                  }`}
                />
                <span className="text-xs font-black mt-0.5">
                  {thread.reactionsCount || 0}
                </span>
              </button>

              {/* Thread Content */}
              <div className="flex-1 min-w-0">
                {/* Status Badges & Category */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {thread.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Pin className="w-3 h-3 text-amber-400" />
                      <span>ปักหมุด</span>
                    </span>
                  )}
                  {thread.isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>ล็อกแล้ว</span>
                    </span>
                  )}
                  {thread.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60">
                      {thread.category.name}
                    </span>
                  )}
                  <FeatureStatusBadge status={thread.featureStatus} />
                </div>

                {/* Title */}
                <Link
                  href={`/board/thread/${thread.id}`}
                  className="block text-base sm:text-lg font-black text-white group-hover:text-orange-400 transition-colors leading-snug"
                >
                  {thread.title}
                </Link>

                {/* Body Snippet */}
                <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                  {thread.body}
                </p>

                {/* Meta Footer */}
                <div className="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-300">{thread.author.name}</span>
                    <UserRoleBadge
                      role={thread.author.role}
                      storeName={thread.author.storeName}
                    />
                  </div>

                  <span>•</span>
                  <span>
                    {new Date(thread.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="ml-auto flex items-center space-x-3 text-slate-400">
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{thread.commentsCount || 0}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{thread.viewsCount || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-30 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ก่อนหน้า
          </button>
          <span className="text-xs font-bold text-slate-400 px-2">
            หน้า {page} จาก {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-30 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ถัดไป
          </button>
        </div>
      )}

      {/* Auth Modal Trigger for unauthenticated upvotes */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          fetchThreads();
        }}
        title={authModalMessage.title}
        subtitle={authModalMessage.subtitle}
      />
    </div>
  );
}
