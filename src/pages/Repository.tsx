import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type Post } from '../lib/supabase';
import { format } from 'date-fns';
import { Eye, EyeOff, Plus, Search, ChevronRight, Filter, BookOpen, Layers, StickyNote, Trash2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useLanguage } from '../lib/language';

export default function Repository() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('All');
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    checkUser();
    fetchPosts();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setIsAdmin(!!user);
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
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
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent link navigation
    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) return;

    try {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;
        
        toast("Post deleted successfully", "success");
        setPosts(posts.filter(p => p.id !== id));
    } catch (err: any) {
        toast("Failed to delete post", "error");
    }
  };

  const toggleVisibility = async (e: React.MouseEvent, post: Post) => {
    e.preventDefault(); // Prevent link navigation
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
        toast(newIsPublic ? "Post is now Public" : "Post is now Private", "info");
    } catch (err) {
        toast("Failed to update visibility", "error");
    }
  };

  useEffect(() => {
    let filtered = posts;
    
    // If not admin, only show public posts
    if (!isAdmin && !loading) {
        filtered = filtered.filter(p => p.is_public);
    }

    // Tab Filter
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

  // Stats for Dashboard
  const stats = {
    total: posts.length,
    public: posts.filter(p => p.is_public).length,
    drafts: posts.filter(p => p.status === 'draft').length,
    notes: posts.filter(p => p.category === 'Catatan').length,
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
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
                {isAdmin ? t('repo.adminTitle') : t('repo.title')}
            </h1>
            <p className="text-muted-foreground max-w-md">
                {isAdmin ? t('repo.adminDesc') : t('repo.desc')}
            </p>
        </div>
        
        {isAdmin && (
            <Link to="/editor/new" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 group">
                <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
                {t('repo.newEntry')}
            </Link>
        )}
      </div>

      {/* Admin Stats Grid */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg"><Layers size={20} /></div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('repo.stats.total')}</span>
                </div>
                <h3 className="text-3xl font-bold text-foreground">{stats.total}</h3>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"><Eye size={20} /></div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('repo.stats.public')}</span>
                </div>
                <h3 className="text-3xl font-bold text-foreground">{stats.public}</h3>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-orange-500/10 text-orange-600 rounded-lg"><StickyNote size={20} /></div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('repo.stats.drafts')}</span>
                </div>
                <h3 className="text-3xl font-bold text-foreground">{stats.drafts}</h3>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg"><BookOpen size={20} /></div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('repo.stats.research')}</span>
                </div>
                <h3 className="text-3xl font-bold text-foreground">{stats.research}</h3>
            </div>
        </div>
      )}

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
                  post.status === 'draft' ? "border-orange-500/30 bg-orange-500/5" : "border-border hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
              )}>
                {post.status === 'draft' && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-xl">
                        Draft
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

                <div className="flex justify-between items-end">
                    <div className="max-w-3xl">
                        <h3 className="text-xl font-serif font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {post.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                            {post.excerpt || post.content.substring(0, 150) + "..."}
                        </p>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart size={14} /> {post.likes || 0}
                        </span>
                        
                        {isAdmin && (
                            <div className="flex items-center gap-2 border-l border-border pl-4 ml-2">
                                <button 
                                    onClick={(e) => toggleVisibility(e, post)}
                                    className={cn("p-2 rounded-full hover:bg-secondary transition-colors", post.is_public ? "text-emerald-500" : "text-orange-500")}
                                    title={post.is_public ? t('repo.makePrivate') : t('repo.makePublic')}
                                >
                                    {post.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button 
                                    onClick={(e) => handleDelete(e, post.id)}
                                    className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title={t('repo.delete')}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        
                        {!isAdmin && (
                            <ChevronRight size={20} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
