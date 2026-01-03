import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type Post } from '../lib/supabase';
import { format } from 'date-fns';
import { Eye, EyeOff, Plus, Search, ChevronRight, Filter, Layers, Trash2, Heart, Users, MousePointerClick, Cpu, Database, TrendingUp, BookOpen, Archive, Pin, PinOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useLanguage } from '../lib/language';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export default function Repository() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  
  // Analytics State
  const [siteVisits, setSiteVisits] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  
  // System Health
  const [aiConfigured, setAiConfigured] = useState(false);

  // Delete Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    checkUser();
    fetchPosts();
    fetchAnalytics();
    
    const hasKey = import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY.includes("YOUR_API_KEY");
    setAiConfigured(!!hasKey);
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(!!user);
  };

  const fetchAnalytics = async () => {
    const { data: visits } = await supabase
        .from('site_visits')
        .select('count')
        .eq('date', new Date().toISOString().split('T')[0])
        .single();
    
    if (visits) setSiteVisits(visits.count);

    const { data: postsStats } = await supabase
        .from('posts')
        .select('view_count, likes');
    
    if (postsStats) {
        const views = postsStats.reduce((acc, curr) => acc + (curr.view_count || 0), 0);
        const likes = postsStats.reduce((acc, curr) => acc + (curr.likes || 0), 0);
        setTotalViews(views);
        setTotalLikes(likes);
    }
  };

  const fetchPosts = async () => {
    try {
      // Order by is_pinned first (descending), then created_at (descending)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setPosts(data);
        setFilteredPosts(data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Admin Actions
  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
        const { error } = await supabase.from('posts').delete().eq('id', deleteId);
        if (error) throw error;
        
        toast("Post deleted successfully", "success");
        setPosts(posts.filter(p => p.id !== deleteId));
        setDeleteId(null);
    } catch (err: any) {
        toast("Failed to delete post", "error");
    }
  };

  const toggleVisibility = async (e: React.MouseEvent, post: Post) => {
    e.preventDefault();
    const newIsPublic = !post.is_public;

    try {
        const { error } = await supabase
            .from('posts')
            .update({ is_public: newIsPublic })
            .eq('id', post.id);

        if (error) throw error;

        // Optimistic update
        const updatedPosts = posts.map(p => 
            p.id === post.id ? { ...p, is_public: newIsPublic } : p
        );
        setPosts(updatedPosts);
        setFilteredPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_public: newIsPublic } : p));
        
        toast(newIsPublic ? "Post is now Public" : "Post is now Private", "info");
    } catch (err: any) {
        console.error(err);
        toast(`Failed to update visibility: ${err.message}`, "error");
    }
  };

  const togglePin = async (e: React.MouseEvent, post: Post) => {
    e.preventDefault();
    const newIsPinned = !post.is_pinned;

    try {
        const { error } = await supabase
            .from('posts')
            .update({ is_pinned: newIsPinned })
            .eq('id', post.id);

        if (error) throw error;

        // Re-fetch to sort correctly or manually sort
        const updatedPosts = posts.map(p => 
            p.id === post.id ? { ...p, is_pinned: newIsPinned } : p
        ).sort((a, b) => {
            // Sort by pinned desc, then date desc
            const aPinned = a.is_pinned ? 1 : 0;
            const bPinned = b.is_pinned ? 1 : 0;
            
            if (aPinned !== bPinned) {
                return bPinned - aPinned;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setPosts(updatedPosts);
        // Force refresh filtered list
        setFilteredPosts(updatedPosts.filter(p => {
             if (!isAdmin && !p.is_public) return false;
             if (activeTab !== 'All' && activeTab !== 'Drafts' && p.category !== activeTab) return false;
             return true;
        }));
        
        toast(newIsPinned ? t('repo.pinSuccess') : t('repo.unpinSuccess'), "info");
    } catch (err: any) {
        console.error(err);
        toast(`Failed to update pin status: ${err.message}`, "error");
    }
  };

  useEffect(() => {
    let filtered = posts;
    
    if (!isAdmin && !loading) {
        filtered = filtered.filter(p => p.is_public);
    }

    if (activeTab === 'Drafts') {
        filtered = filtered.filter(p => p.status === 'draft');
    } else if (activeTab !== 'All') {
        filtered = filtered.filter(p => p.category === activeTab);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(lowerQuery) || 
        post.excerpt?.toLowerCase().includes(lowerQuery) ||
        post.category?.toLowerCase().includes(lowerQuery) ||
        post.subcategory?.toLowerCase().includes(lowerQuery)
      );
    }
    setFilteredPosts(filtered);
  }, [searchQuery, posts, isAdmin, loading, activeTab]);

  const stats = {
    total: posts.length,
    public: posts.filter(p => p.is_public).length,
    drafts: posts.filter(p => p.status === 'draft').length,
    research: posts.filter(p => p.category === 'Penelitian').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-12 w-12 bg-primary/20 rounded-xl"></div>
            <div className="h-4 w-32 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  const tabs = [
      { id: 'All', label: t('repo.tabs.all') },
      { id: 'Catatan', label: t('repo.tabs.notes') },
      { id: 'Penelitian', label: t('repo.tabs.research') },
      { id: 'Bahasan', label: t('repo.tabs.discussion') }
  ];
  if (isAdmin) tabs.push({ id: 'Drafts', label: t('repo.tabs.drafts') });

  return (
    <div className="min-h-screen pt-28 px-5 md:px-8 max-w-6xl mx-auto pb-20">
      <ConfirmDialog 
        isOpen={!!deleteId}
        title={t('repo.deleteTitle')}
        message={t('repo.deleteMsg')}
        confirmText={t('editor.confirm')}
        cancelText={t('editor.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
                {t('repo.title')}
            </h1>
            <p className="text-muted-foreground max-w-md">
                {t('repo.desc')}
            </p>
        </div>
        
        {isAdmin && (
            <Link to="/editor/new" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 group">
                <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
                {t('repo.newEntry')}
            </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="space-y-6 mb-12">
            {isAdmin && (
                <div className="flex gap-4 overflow-x-auto pb-2 mb-4">
                    <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border", aiConfigured ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20")}>
                        <Cpu size={14} /> AI System: {aiConfigured ? "Online" : "Missing Key"}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        <Database size={14} /> Database: Connected
                    </div>
                </div>
            )}

            <div className={cn("grid gap-4", isAdmin ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1")}>
                
                {!isAdmin ? (
                    <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Archive size={180} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <BookOpen size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">
                                    {stats.public} Public Entries
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                                    Explore a curated collection of technical notes, research papers, and system architecture documentation.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="bg-card p-6 rounded-[24px] border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Layers size={100} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                    <Layers size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{t('repo.stats.total')}</span>
                                </div>
                                <h3 className="text-4xl font-serif font-bold text-foreground">{stats.public}</h3>
                                <p className="text-xs text-muted-foreground mt-2">Published Entries</p>
                            </div>
                        </div>

                        <div className="bg-[#E3F2FD] dark:bg-[#1E2A38] p-6 rounded-[24px] border border-blue-200/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute -bottom-4 -right-4 text-blue-500/10 group-hover:text-blue-500/20 transition-colors">
                                <Users size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                                    <TrendingUp size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Visitors (Today)</span>
                                </div>
                                <h3 className="text-4xl font-serif font-bold text-foreground">{siteVisits}</h3>
                                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">Active readers</p>
                            </div>
                        </div>

                        <div className="bg-[#E8F5E9] dark:bg-[#1B3320] p-6 rounded-[24px] border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute -bottom-4 -right-4 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
                                <MousePointerClick size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                                    <MousePointerClick size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Total Views</span>
                                </div>
                                <h3 className="text-4xl font-serif font-bold text-foreground">{totalViews}</h3>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-2">All time reads</p>
                            </div>
                        </div>

                        <div className="bg-[#FFEBEE] dark:bg-[#3E1F21] p-6 rounded-[24px] border border-red-200/50 dark:border-red-800/30 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute -bottom-4 -right-4 text-red-500/10 group-hover:text-red-500/20 transition-colors">
                                <Heart size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                                    <Heart size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Appreciations</span>
                                </div>
                                <h3 className="text-4xl font-serif font-bold text-foreground">{totalLikes}</h3>
                                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-2">Community love</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-8 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center sticky top-24 z-30 backdrop-blur-md bg-card/90">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                        activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
                type="text" 
                placeholder={t('repo.search')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/50 border border-transparent rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
        </div>
      </div>

      {/* List View */}
      <div className="space-y-4">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link to={`/post/${post.id}`} className="block group">
              <div className={cn(
                  "bg-card border rounded-xl p-6 transition-all duration-300 relative overflow-hidden",
                  post.status === 'draft' ? "border-orange-500/30 bg-orange-500/5" : "border-border hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
                  post.is_pinned && "border-l-4 border-l-primary"
              )}>
                {post.status === 'draft' && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-xl">
                        Draft
                    </div>
                )}
                
                {post.is_pinned && !post.status && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-bl-xl flex items-center gap-1">
                        <Pin size={10} className="fill-current" /> Pinned
                    </div>
                )}
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={cn(
                            "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                            post.category === 'Catatan' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                            post.category === 'Penelitian' ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}>
                            {post.category || 'Umum'}
                        </span>
                        
                        {post.subcategory && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                                {post.subcategory}
                            </span>
                        )}
                    </div>
                    
                    <span className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                        {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="max-w-3xl w-full">
                        <h3 className="text-xl font-serif font-bold text-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
                            {post.title}
                            {post.is_pinned && <Pin size={16} className="text-primary fill-primary rotate-45" />}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                            {post.excerpt || post.content.substring(0, 150) + "..."}
                        </p>
                    </div>
                    
                    <div className="flex items-center justify-between w-full md:w-auto gap-4 text-muted-foreground mt-2 md:mt-0">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Views">
                                <Eye size={14} /> {post.view_count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Likes">
                                <Heart size={14} /> {post.likes || 0}
                            </span>
                        </div>
                        
                        {isAdmin && (
                            <div className="flex items-center gap-2 border-l border-border pl-4 ml-2">
                                <button 
                                    onClick={(e) => togglePin(e, post)}
                                    className={cn("p-2 rounded-full hover:bg-secondary transition-colors", post.is_pinned ? "text-primary" : "text-muted-foreground")}
                                    title={post.is_pinned ? t('repo.unpin') : t('repo.pin')}
                                >
                                    {post.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                                </button>
                                <button 
                                    onClick={(e) => toggleVisibility(e, post)}
                                    className={cn("p-2 rounded-full hover:bg-secondary transition-colors", post.is_public ? "text-emerald-500" : "text-orange-500")}
                                    title={post.is_public ? t('repo.makePrivate') : t('repo.makePublic')}
                                >
                                    {post.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button 
                                    onClick={(e) => confirmDelete(e, post.id)}
                                    className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title={t('repo.delete')}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        
                        {!isAdmin && (
                            <ChevronRight size={20} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all ml-auto md:ml-0" />
                        )}
                    </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}

        {filteredPosts.length === 0 && (
            <div className="text-center py-24 text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                    <Filter size={24} />
                </div>
                <p className="font-medium">{t('repo.noEntries')}</p>
                {isAdmin && (
                    <Link to="/editor/new" className="text-primary text-sm font-bold mt-2 inline-block hover:underline">
                        {t('repo.newEntry')}
                    </Link>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
