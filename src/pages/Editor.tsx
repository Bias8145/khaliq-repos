import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Save, ArrowLeft, Bold, Italic, Underline, List, ChevronDown, Layout, Globe, Lock, Hash, FileText, Eye, PenLine, Trash2, CheckCircle2, AlertTriangle, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useLanguage } from '../lib/language';

// Predefined lists for suggestions
const CATEGORY_SUGGESTIONS = ["Catatan", "Penelitian", "Bahasan", "Jurnal", "Proyek"];
const SUBCATEGORY_SUGGESTIONS = ["Agama", "Sains", "Filsafat", "Teknologi", "Umum", "Android", "Water Treatment", "HSE"];

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Catatan');
  const [subcategory, setSubcategory] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [isPublic, setIsPublic] = useState(true); // Default to public
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast("Please login to access the editor", "error");
        navigate('/login');
        return;
      }
      setUserId(user.id);
      
      if (id && id !== 'new') {
        const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
        if (error) {
            toast("Failed to load post", "error");
            return;
        }
        if (data) {
          setTitle(data.title);
          setContent(data.content);
          setExcerpt(data.excerpt || '');
          setStatus(data.status || (data.is_public ? 'published' : 'draft'));
          setIsPublic(data.is_public);
          setCategory(data.category || 'Catatan');
          setSubcategory(data.subcategory || '');
        }
      }
    };
    checkUser();
  }, [id, navigate]);

  const handleSave = async (newStatus?: 'published' | 'draft') => {
    const finalStatus = newStatus || status;
    
    if (!title.trim()) {
        toast("Please enter a title", "error");
        return;
    }
    if (!userId) {
        toast("Session expired. Please login again.", "error");
        return;
    }

    setLoading(true);

    const postData = {
      title,
      content,
      excerpt,
      status: finalStatus,
      is_public: isPublic, // Explicit visibility control
      category,
      subcategory,
      author_id: userId,
      updated_at: new Date().toISOString(),
    };

    try {
        let error;
        if (id && id !== 'new') {
          const { error: updateError } = await supabase.from('posts').update(postData).eq('id', id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase.from('posts').insert([postData]);
          error = insertError;
        }

        if (error) throw error;
        
        toast(finalStatus === 'draft' ? "Draft saved successfully" : "Post published successfully", "success");
        
        if (finalStatus === 'published') {
            setTimeout(() => navigate('/repo'), 1000);
        }
    } catch (err: any) {
        console.error("Save Error:", err);
        toast(`Failed to save: ${err.message}`, "error");
    } finally {
        setLoading(false);
        if (newStatus) setStatus(newStatus);
    }
  };

  const handleDelete = async () => {
    if (!id || id === 'new') return;
    if (!window.confirm(t('editor.deleteConfirm'))) return;

    setLoading(true);
    try {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;
        toast("Post deleted successfully", "success");
        navigate('/repo');
    } catch (err: any) {
        toast(`Failed to delete: ${err.message}`, "error");
        setLoading(false);
    }
  };

  const insertFormat = (tag: string) => {
    const textarea = document.getElementById('content-area') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    let formatted = '';

    switch(tag) {
        case 'h1': formatted = `\n# ${selection}`; break;
        case 'h2': formatted = `\n## ${selection}`; break;
        case 'h3': formatted = `\n### ${selection}`; break;
        case 'b': formatted = `**${selection}**`; break;
        case 'i': formatted = `*${selection}*`; break;
        case 'u': formatted = `<u>${selection}</u>`; break;
        case 'list': formatted = `\n- ${selection}`; break;
        default: formatted = selection;
    }
    
    setContent(before + formatted + after);
    
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + formatted.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="min-h-screen pt-24 px-5 md:px-8 max-w-5xl mx-auto pb-32">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 sticky top-20 z-20 bg-background/80 backdrop-blur-md py-4 border-b border-border/50">
        <Link to="/repo" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> {t('editor.back')}
        </Link>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsPreview(!isPreview)}
                className="px-4 py-2 bg-secondary/50 text-foreground font-bold rounded-lg hover:bg-secondary transition-all text-xs flex items-center gap-2 mr-2"
            >
                {isPreview ? <PenLine size={14} /> : <Eye size={14} />}
                {isPreview ? t('editor.edit') : t('editor.preview')}
            </button>
            <button 
                onClick={() => handleSave('draft')}
                disabled={loading}
                className="px-4 py-2 bg-secondary text-foreground font-bold rounded-lg hover:bg-secondary/80 transition-all text-xs flex items-center gap-2"
            >
                <FileText size={14} />
                {t('editor.saveDraft')}
            </button>
            <button 
                onClick={() => handleSave('published')}
                disabled={loading}
                className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2 text-xs"
            >
                <Save size={14} />
                {loading ? t('editor.publishing') : t('editor.publish')}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Editor Column */}
        <div className="lg:col-span-2 space-y-6">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('editor.titlePlaceholder')}
                className="w-full bg-transparent border-none text-3xl md:text-5xl font-serif font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 px-0 leading-tight"
            />

            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-primary/50 transition-all min-h-[500px]">
                {/* Toolbar - Only show in Edit mode */}
                {!isPreview && (
                    <div className="flex items-center gap-1 p-2 border-b border-border bg-secondary/30 overflow-x-auto sticky top-0 z-10 backdrop-blur-sm">
                        <button onClick={() => insertFormat('h1')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground font-bold text-[10px]" title="Heading 1">H1</button>
                        <button onClick={() => insertFormat('h2')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground font-bold text-[10px]" title="Heading 2">H2</button>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <button onClick={() => insertFormat('b')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground" title="Bold"><Bold size={16} /></button>
                        <button onClick={() => insertFormat('i')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground" title="Italic"><Italic size={16} /></button>
                        <button onClick={() => insertFormat('u')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground" title="Underline"><Underline size={16} /></button>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <button onClick={() => insertFormat('list')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground" title="List"><List size={16} /></button>
                    </div>
                )}
                
                {isPreview ? (
                    <div className="p-8 bg-card">
                        <MarkdownRenderer content={content || '*No content yet...*'} />
                    </div>
                ) : (
                    <textarea
                        id="content-area"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={t('editor.contentPlaceholder')}
                        className="w-full h-full min-h-[500px] p-6 bg-transparent border-none outline-none resize-y font-serif text-lg leading-relaxed text-foreground/90"
                    />
                )}
            </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 sticky top-32">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2 border-b border-border pb-4">
                    <Layout size={16} className="text-primary" /> {t('editor.settings')}
                </h3>

                {/* Status & Visibility Control - ENHANCED */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            {t('editor.visibility')} <span className="text-xs font-normal normal-case text-primary">({t('editor.adminControl')})</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setIsPublic(true)}
                                className={cn(
                                    "py-3 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1",
                                    isPublic 
                                        ? "bg-primary/10 border-primary text-primary shadow-sm" 
                                        : "bg-transparent border-border text-muted-foreground hover:bg-secondary"
                                )}
                            >
                                <Globe size={16} /> {t('editor.public')}
                            </button>
                            <button
                                onClick={() => setIsPublic(false)}
                                className={cn(
                                    "py-3 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1",
                                    !isPublic 
                                        ? "bg-foreground/5 border-foreground text-foreground shadow-sm" 
                                        : "bg-transparent border-border text-muted-foreground hover:bg-secondary"
                                )}
                            >
                                <Lock size={16} /> {t('editor.private')}
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight bg-secondary/30 p-2 rounded-md border border-border/50">
                            {isPublic 
                                ? t('editor.publicDesc')
                                : t('editor.privateDesc')}
                        </p>
                    </div>
                </div>

                {/* Classification - IMPROVED WITH VISIBLE CHIPS */}
                <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('editor.category')}</label>
                        <div className="relative">
                            <input 
                                list="category-suggestions"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-secondary/50 border border-transparent rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder={t('editor.selectOrType')}
                            />
                            <datalist id="category-suggestions">
                                {CATEGORY_SUGGESTIONS.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                        {/* Visible Chips for Quick Select */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {CATEGORY_SUGGESTIONS.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-bold border transition-all",
                                        category === cat 
                                            ? "bg-primary/10 border-primary text-primary" 
                                            : "bg-transparent border-border text-muted-foreground hover:bg-secondary"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('editor.subcategory')}</label>
                        <div className="relative">
                            <input 
                                list="subcategory-suggestions"
                                value={subcategory}
                                onChange={(e) => setSubcategory(e.target.value)}
                                className="w-full bg-secondary/50 border border-transparent rounded-lg p-3 text-sm font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder={t('editor.selectOrType')}
                            />
                            <datalist id="subcategory-suggestions">
                                {SUBCATEGORY_SUGGESTIONS.map(sub => <option key={sub} value={sub} />)}
                            </datalist>
                        </div>
                         {/* Visible Chips for Quick Select */}
                         <div className="flex flex-wrap gap-2 mt-2">
                            {SUBCATEGORY_SUGGESTIONS.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setSubcategory(sub)}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-bold border transition-all",
                                        subcategory === sub 
                                            ? "bg-primary/10 border-primary text-primary" 
                                            : "bg-transparent border-border text-muted-foreground hover:bg-secondary"
                                    )}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('editor.excerpt')}</label>
                    <textarea
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder={t('editor.excerptPlaceholder')}
                        rows={4}
                        className="w-full bg-secondary/50 border border-transparent rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                    />
                </div>

                {/* Danger Zone */}
                {id && id !== 'new' && (
                    <div className="pt-6 mt-6 border-t border-border">
                        <button 
                            onClick={handleDelete}
                            className="w-full py-3 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/5 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                            <Trash2 size={14} /> {t('editor.delete')}
                        </button>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
