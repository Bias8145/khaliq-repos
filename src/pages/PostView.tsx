import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type Post } from '../lib/supabase';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Clock, Share2, Printer, Heart, Link as LinkIcon, Twitter, Linkedin, MessageCircle, Download, ImageIcon, X, Loader2, Feather, Send, Check, Moon, Sun, RefreshCw, Maximize, Smartphone, Square, Layout, MousePointerClick, TextCursorInput, Globe, Microscope, Book, MessageSquareQuote, FileText, Pin } from 'lucide-react';
import { calculateReadingTime } from '../lib/utils';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/language';
import html2canvas from 'html2canvas';

type AspectRatio = 'auto' | 'portrait' | 'square' | 'story';
type CardTheme = 'dark' | 'light';

export default function PostView() {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showVisualShare, setShowVisualShare] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [liked, setLiked] = useState(false);
  
  // Visual Share State
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
  const [cardTheme, setCardTheme] = useState<CardTheme>('light'); // Default to light to match reference image vibe
  const [customExcerpt, setCustomExcerpt] = useState('');
  const [isSelectingText, setIsSelectingText] = useState(false);
  
  const { toast } = useToast();
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Scroll Progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      let clientId = localStorage.getItem('khaliq_client_id');
      if (!clientId) {
        clientId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('khaliq_client_id', clientId);
      }

      const { data: likeData } = await supabase
        .from('post_likes_log')
        .select('id')
        .eq('post_id', id)
        .eq('client_id', clientId)
        .single();
      
      if (likeData) setLiked(true);

      const viewedKey = `viewed_post_${id}`;
      if (!sessionStorage.getItem(viewedKey)) {
        await supabase.rpc('increment_view_count', { post_id: id });
        sessionStorage.setItem(viewedKey, 'true');
      }

      const { data } = await supabase.from('posts').select('*').eq('id', id).single();
      
      if (data) {
        setPost(data);
        setReadingTime(calculateReadingTime(data.content));
        setCustomExcerpt(data.excerpt || data.content.substring(0, 120).replace(/[#*`]/g, '') + "...");
        document.title = `${data.title} | Bias Fajar Khaliq`;

        if (data.category) {
            const { data: related } = await supabase
                .from('posts')
                .select('id, title, category, created_at')
                .eq('category', data.category)
                .neq('id', id)
                .eq('is_public', true)
                .limit(3);
            if (related) setRelatedPosts(related);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCanEdit(true);
    };
    fetchPost();

    return () => { document.title = 'Bias Fajar Khaliq | Repository'; }
  }, [id]);

  useEffect(() => {
    if (showVisualShare && !isSelectingText) {
        const selection = window.getSelection()?.toString().trim();
        if (selection && selection.length > 0) {
            setCustomExcerpt(selection);
            toast(t('post.tip'), "info");
        }
    }
  }, [showVisualShare, isSelectingText]);

  const getShareUrl = () => {
    if (!id) return window.location.href;
    return `${window.location.origin}/post/${id}`;
  };

  const handleNativeShare = async () => {
    const shareUrl = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt || 'Check out this post from Khaliq Repository',
          url: shareUrl,
        });
        toast(t('post.sharedSuccess'), "success");
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const copyToClipboard = () => {
    const shareUrl = getShareUrl();
    navigator.clipboard.writeText(shareUrl);
    toast(t('post.linkCopied'), "success");
    setShowShareMenu(false);
  };

  const shareToSocial = (platform: 'whatsapp' | 'twitter' | 'linkedin') => {
    const shareUrl = getShareUrl();
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(post?.title || '');
    let finalLink = '';

    switch (platform) {
        case 'whatsapp': finalLink = `https://wa.me/?text=${text}%20${url}`; break;
        case 'twitter': finalLink = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break;
        case 'linkedin': finalLink = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`; break;
    }
    
    window.open(finalLink, '_blank');
    setShowShareMenu(false);
  };

  const handleLike = async () => {
    if (!id) return;
    
    const clientId = localStorage.getItem('khaliq_client_id') || 'unknown';
    
    const newLikedState = !liked;
    setLiked(newLikedState);
    if (post) {
        setPost({ ...post, likes: Math.max(0, (post.likes || 0) + (newLikedState ? 1 : -1)) });
    }

    try { 
        await supabase.rpc('toggle_like', { p_id: id, c_id: clientId }); 
    } catch (error) { 
        console.error(error); 
        setLiked(!newLikedState);
        if (post) setPost({ ...post, likes: Math.max(0, (post.likes || 0) + (newLikedState ? -1 : 1)) });
    }
  };

  const handleDownload = () => {
    if (!post) return;
    const element = document.createElement("a");
    const fileContent = `# ${post.title}\n\nAuthor: Bias Fajar Khaliq\nDate: ${format(new Date(post.created_at), 'yyyy-MM-dd')}\nLink: ${getShareUrl()}\n\n---\n\n${post.excerpt ? `> ${post.excerpt}\n\n` : ''}${post.content}`;
    const file = new Blob([fileContent], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast("File downloaded successfully", "success");
  };

  // ROBUST IMAGE GENERATION: CLONE & CAPTURE
  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    
    // 1. Clone the node
    const clone = cardRef.current.cloneNode(true) as HTMLElement;
    
    // 2. Style the clone to be fixed width and hidden
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = '600px'; // Force 600px width
    clone.style.height = 'auto';
    clone.style.zIndex = '-1';
    clone.style.transform = 'none';
    clone.style.borderRadius = '0';

    // Append to body
    document.body.appendChild(clone);

    try {
        // 3. Capture the clone
        const canvas = await html2canvas(clone, {
            scale: 2, 
            backgroundColor: cardTheme === 'dark' ? '#18181B' : '#FFFFFF',
            useCORS: true,
            logging: false,
            allowTaint: true,
            width: 600,
            windowWidth: 1200,
        });

        return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
    } catch (err) {
        console.error("Capture failed:", err);
        return null;
    } finally {
        // 4. Clean up
        document.body.removeChild(clone);
    }
  };

  const handleDownloadImage = async () => {
    setGeneratingImage(true);
    try {
        const blob = await generateImageBlob();
        if (!blob) throw new Error("Failed to generate blob");

        const image = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = image;
        link.download = `khaliq-repo-${post?.title.slice(0, 20).replace(/\s+/g, '-')}.png`;
        link.click();
        toast("Image saved successfully", "success");
    } catch (error) {
        console.error("Image generation failed", error);
        toast("Failed to generate image", "error");
    } finally {
        setGeneratingImage(false);
    }
  };

  const handleSmartShare = async () => {
    if (!post) return;
    setGeneratingImage(true);
    try {
        const blob = await generateImageBlob();
        if (!blob) throw new Error("Failed to generate blob");

        const file = new File([blob], `khaliq-repo-${post.id}.png`, { type: 'image/png' });
        const shareData = {
            title: post.title,
            text: `${post.title}\n\nRead more at:`,
            url: getShareUrl(),
            files: [file]
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast("Shared successfully", "success");
        } else {
            handleNativeShare();
        }
    } catch (error) {
        console.error("Smart share failed", error);
        handleNativeShare();
    } finally {
        setGeneratingImage(false);
    }
  };

  const startSelectionMode = () => {
    setShowVisualShare(false);
    setIsSelectingText(true);
  };

  const captureSelection = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
        setCustomExcerpt(selection);
        toast("Selection captured!", "success");
    } else {
        toast("No text selected. Using previous text.", "info");
    }
    setIsSelectingText(false);
    setShowVisualShare(true);
  };

  const cancelSelection = () => {
    setIsSelectingText(false);
    setShowVisualShare(true);
  };

  // Helper to determine icon based on category
  const getCategoryIcon = (category?: string) => {
    switch(category) {
        case 'Penelitian': return Microscope;
        case 'Catatan': return Book;
        case 'Bahasan': return MessageSquareQuote;
        default: return FileText;
    }
  };
  
  const BackgroundIcon = getCategoryIcon(post?.category);

  if (!post) return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-t-2 border-primary rounded-full"></div>
    </div>
  );

  return (
    <>
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-[60] no-print" style={{ scaleX }} />

      <div className="min-h-screen pt-24 px-6 max-w-5xl mx-auto pb-20">
        <Link to="/repo" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors group text-sm font-medium no-print">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {t('post.back')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Main Content */}
            <article className="lg:col-span-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="mb-10">
                    <div className="flex gap-2 mb-6 no-print">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10">
                            {post.category || 'General'}
                        </span>
                        {post.subcategory && (
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-1 rounded-full bg-secondary">
                                {post.subcategory}
                            </span>
                        )}
                        {post.is_pinned && (
                            <span className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10 flex items-center gap-1">
                                <Pin size={12} className="fill-current" /> Pinned
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6">{post.title}</h1>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
                        <span className="font-bold text-foreground">Bias Fajar Khaliq</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                        <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {readingTime} {t('post.readTime')}</span>
                    </div>
                </header>

                <div className="min-h-[300px] mb-16">
                    <MarkdownRenderer content={post.content} />
                </div>

                {/* Interaction Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-t border-border no-print">
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLike}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold",
                            liked ? "bg-red-50 text-red-500" : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-red-500"
                        )}
                    >
                        <Heart size={18} className={cn(liked && "fill-current")} />
                        {liked ? t('post.liked') : t('post.like')} {post.likes > 0 && <span className="opacity-70">({post.likes})</span>}
                    </motion.button>

                    <div className="flex gap-2 relative flex-wrap">
                         {canEdit && (
                            <Link to={`/editor/${post.id}`} className="p-2.5 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                                <Edit size={18} />
                            </Link>
                        )}
                        <button onClick={handleDownload} className="p-2.5 bg-secondary rounded-full hover:bg-foreground hover:text-background transition-colors" title={t('post.download')}>
                            <Download size={18} />
                        </button>
                        <button onClick={() => window.print()} className="p-2.5 bg-secondary rounded-full hover:bg-foreground hover:text-background transition-colors" title="Print">
                            <Printer size={18} />
                        </button>
                        <button onClick={() => setShowVisualShare(true)} className="p-2.5 bg-secondary rounded-full hover:bg-purple-600 hover:text-white transition-colors" title={t('post.visualShare')}>
                            <ImageIcon size={18} />
                        </button>
                        
                        <div className="relative">
                            <button 
                                onClick={handleNativeShare}
                                className="px-4 py-2.5 bg-foreground text-background rounded-full hover:opacity-90 transition-colors flex items-center gap-2 text-sm font-bold"
                            >
                                <Share2 size={18} /> {t('post.share')}
                            </button>

                            <AnimatePresence>
                                {showShareMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full right-0 mb-2 w-48 bg-card border border-border rounded-xl shadow-xl p-2 z-50 origin-bottom-right"
                                    >
                                        <button onClick={() => shareToSocial('whatsapp')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary rounded-lg text-sm text-foreground transition-colors text-left">
                                            <MessageCircle size={16} className="text-green-500" /> WhatsApp
                                        </button>
                                        <button onClick={() => shareToSocial('twitter')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary rounded-lg text-sm text-foreground transition-colors text-left">
                                            <Twitter size={16} className="text-blue-400" /> X / Twitter
                                        </button>
                                        <button onClick={() => shareToSocial('linkedin')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary rounded-lg text-sm text-foreground transition-colors text-left">
                                            <Linkedin size={16} className="text-blue-700" /> LinkedIn
                                        </button>
                                        <div className="h-px bg-border my-1"></div>
                                        <button onClick={copyToClipboard} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary rounded-lg text-sm text-foreground transition-colors text-left">
                                            <LinkIcon size={16} /> {t('post.copyLink')}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </article>

            {/* Sidebar: Table of Contents & Related */}
            <aside className="lg:col-span-4 space-y-8 no-print">
                <div className="sticky top-24 space-y-8">
                    {/* Table of Contents */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">{t('post.onThisPage')}</h3>
                        <TableOfContents content={post.content} />
                    </div>

                    {/* Related Posts */}
                    {relatedPosts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">{t('post.related')}</h3>
                            <div className="space-y-3">
                                {relatedPosts.map(related => (
                                    <Link key={related.id} to={`/post/${related.id}`} className="block p-4 rounded-xl bg-secondary/30 hover:bg-secondary border border-transparent hover:border-border transition-all group">
                                        <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2">{related.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-2">{format(new Date(related.created_at), 'MMM d')}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </div>

        {/* Selection Mode Floating Bar */}
        <AnimatePresence>
            {isSelectingText && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-4"
                >
                    <div className="bg-foreground text-background rounded-full shadow-2xl px-6 py-4 flex items-center gap-6 max-w-md w-full justify-between">
                        <div className="flex items-center gap-3">
                            <TextCursorInput size={20} className="animate-pulse" />
                            <span className="text-sm font-bold">{t('post.selectionInstruction')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={cancelSelection}
                                className="p-2 rounded-full hover:bg-background/20 transition-colors"
                                title={t('post.cancelSelection')}
                            >
                                <X size={18} />
                            </button>
                            <button 
                                onClick={captureSelection}
                                className="px-4 py-2 bg-background text-foreground rounded-full text-xs font-bold hover:scale-105 transition-transform"
                            >
                                {t('post.captureSelection')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Visual Share Modal */}
        <AnimatePresence>
            {showVisualShare && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                >
                    <div className="relative w-full max-w-2xl flex flex-col items-center my-auto">
                        {/* Controls */}
                        <div className="w-full bg-card border border-border rounded-2xl p-5 mb-6 shadow-lg space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Size Selector */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                        <Maximize size={14} /> {t('post.cardSize')}
                                    </span>
                                    <div className="grid grid-cols-4 gap-1 bg-secondary rounded-lg p-1">
                                        <button onClick={() => setAspectRatio('auto')} className={cn("py-2 rounded-md transition-all flex justify-center", aspectRatio === 'auto' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")} title={t('post.sizes.auto')}>
                                            <Layout size={16} />
                                        </button>
                                        <button onClick={() => setAspectRatio('portrait')} className={cn("py-2 rounded-md transition-all flex justify-center", aspectRatio === 'portrait' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")} title={t('post.sizes.portrait')}>
                                            <Smartphone size={16} />
                                        </button>
                                        <button onClick={() => setAspectRatio('square')} className={cn("py-2 rounded-md transition-all flex justify-center", aspectRatio === 'square' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")} title={t('post.sizes.square')}>
                                            <Square size={16} />
                                        </button>
                                        <button onClick={() => setAspectRatio('story')} className={cn("py-2 rounded-md transition-all flex justify-center", aspectRatio === 'story' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")} title={t('post.sizes.story')}>
                                            <Smartphone size={16} className="scale-y-110" />
                                        </button>
                                    </div>
                                </div>

                                {/* Theme & Text */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                            <Sun size={14} /> {t('post.cardTheme')}
                                        </span>
                                        <div className="flex bg-secondary rounded-lg p-1">
                                            <button 
                                                onClick={() => setCardTheme('dark')}
                                                className={cn("flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2", cardTheme === 'dark' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                                            >
                                                <Moon size={12} /> Dark
                                            </button>
                                            <button 
                                                onClick={() => setCardTheme('light')}
                                                className={cn("flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2", cardTheme === 'light' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                                            >
                                                <Sun size={12} /> Light
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase text-muted-foreground">{t('post.customizeText')}</span>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={startSelectionMode}
                                                    className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline bg-primary/10 px-2 py-1 rounded-md"
                                                >
                                                    <MousePointerClick size={12} /> {t('post.selectFromPage')}
                                                </button>
                                                <button 
                                                    onClick={() => setCustomExcerpt(post.excerpt || post.content.substring(0, 120))}
                                                    className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:text-foreground"
                                                >
                                                    <RefreshCw size={10} /> {t('post.reset')}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={customExcerpt}
                                            onChange={(e) => setCustomExcerpt(e.target.value)}
                                            className="w-full bg-secondary/50 border border-transparent rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
                                            placeholder="Enter text to display on card..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* REBUILT SHARE CARD - Adapted to Reference Image */}
                        <div className="w-full flex justify-center mb-6">
                            <div 
                                ref={cardRef}
                                className={cn(
                                    "relative w-full flex flex-col justify-between overflow-hidden p-10 transition-colors duration-300",
                                    aspectRatio === 'square' ? "aspect-square" : 
                                    aspectRatio === 'portrait' ? "aspect-[4/5]" : 
                                    aspectRatio === 'story' ? "aspect-[9/16]" : 
                                    "min-h-[500px] h-auto",
                                    cardTheme === 'dark' ? "bg-[#18181B] text-white" : "bg-white text-zinc-900"
                                )}
                                style={{ 
                                    borderRadius: '24px',
                                    border: cardTheme === 'dark' ? '1px solid #27272A' : '1px solid #E4E4E7',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                                }}
                            >
                                {/* Background Elements */}
                                <div className={cn("absolute inset-0", cardTheme === 'dark' ? "bg-[#18181B]" : "bg-[#FAFAFA]")}></div>
                                
                                {/* Top Right Curve Decoration */}
                                <div className={cn(
                                    "absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-50",
                                    cardTheme === 'dark' ? "bg-white/5" : "bg-black/5"
                                )}></div>
                                
                                {/* Large Background Icon - Subtle Watermark */}
                                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-[0.03] pointer-events-none">
                                    <BackgroundIcon size={400} className={cn("rotate-[-10deg]", cardTheme === 'dark' ? "text-white" : "text-black")} />
                                </div>
                                
                                {/* Header: Logo & Brand */}
                                <div className="relative z-10 flex items-center gap-4 mb-12">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full border flex items-center justify-center",
                                        cardTheme === 'dark' ? "border-white/20 bg-white/5 text-white" : "border-black/10 bg-white text-black"
                                    )}>
                                        <Feather size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn("text-xs font-bold tracking-widest uppercase", cardTheme === 'dark' ? "text-white" : "text-zinc-900")}>
                                            Khaliq Repository
                                        </span>
                                        <span className={cn("text-[10px] tracking-wider uppercase opacity-60", cardTheme === 'dark' ? "text-white" : "text-zinc-900")}>
                                            Digital Garden & Archive
                                        </span>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="relative z-10 flex-grow flex flex-col justify-center mb-8">
                                    <h2 className={cn(
                                        "text-4xl md:text-5xl font-bold tracking-tight mb-8 font-sans leading-[1.1]", 
                                        cardTheme === 'dark' ? "text-white" : "text-zinc-900"
                                    )}>
                                        {post.title}
                                    </h2>
                                    
                                    {/* Quote / Excerpt with Bar */}
                                    <div className={cn(
                                        "pl-6 border-l-4",
                                        cardTheme === 'dark' ? "border-white/20" : "border-zinc-200"
                                    )}>
                                        <p className={cn(
                                            "text-lg md:text-xl leading-relaxed italic", 
                                            cardTheme === 'dark' ? "text-gray-300" : "text-zinc-600"
                                        )}>
                                            "{customExcerpt}"
                                        </p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className={cn(
                                    "relative z-10 pt-8 border-t flex items-end justify-between w-full", 
                                    cardTheme === 'dark' ? "border-white/10" : "border-black/5"
                                )}>
                                    {/* Left: Website URL (Replaces Author Info) */}
                                    <div className="flex items-center gap-2">
                                         <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                            cardTheme === 'dark' ? "bg-white text-black" : "bg-black text-white"
                                         )}>
                                            <Globe size={14} />
                                         </div>
                                         <span className={cn("text-xs font-bold tracking-wide", cardTheme === 'dark' ? "text-white" : "text-zinc-900")}>
                                            khaliq-repos.pages.dev
                                         </span>
                                    </div>

                                    {/* Right: Date & Meta */}
                                    <div className="text-right">
                                        <p className={cn("text-[10px] uppercase tracking-wider opacity-60 mb-1", cardTheme === 'dark' ? "text-white" : "text-zinc-900")}>
                                            {format(new Date(post.created_at), 'MMMM d, yyyy')}
                                        </p>
                                        <p className={cn("text-xs font-bold", cardTheme === 'dark' ? "text-white" : "text-zinc-900")}>
                                            {post.category || 'Bahasan'} • {readingTime} min read
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
                            <button 
                                onClick={handleSmartShare}
                                disabled={generatingImage}
                                className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-3 text-sm"
                            >
                                {generatingImage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                Share Card & Link
                            </button>
                            
                            <button 
                                onClick={handleDownloadImage}
                                disabled={generatingImage}
                                className="px-8 py-4 bg-secondary text-foreground font-bold rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-3 text-sm"
                            >
                                {generatingImage ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                {t('post.downloadImage')}
                            </button>

                            <button 
                                onClick={() => setShowVisualShare(false)}
                                className="px-8 py-4 bg-transparent border border-border text-muted-foreground hover:text-foreground font-bold rounded-full hover:bg-secondary transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <X size={18} />
                                {t('post.close')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </>
  );
}

// Helper component to generate TOC
function TableOfContents({ content }: { content: string }) {
    const headings = content.match(/^#{1,3} (.*$)/gim);
    
    if (!headings || headings.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No sections found.</p>;
    }

    return (
        <nav className="flex flex-col gap-2">
            {headings.map((heading, index) => {
                const level = heading.match(/^#+/)?.[0].length || 1;
                const text = heading.replace(/^#+ /, '');
                
                return (
                    <a 
                        key={index} 
                        href={`#`} 
                        onClick={(e) => {
                            e.preventDefault();
                            const elements = document.querySelectorAll('h1, h2, h3');
                            for (const el of elements) {
                                if (el.textContent === text) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    break;
                                }
                            }
                        }}
                        className={cn(
                            "text-sm transition-colors hover:text-primary line-clamp-1",
                            level === 1 ? "font-bold text-foreground" : 
                            level === 2 ? "pl-3 text-muted-foreground" : 
                            "pl-6 text-muted-foreground/80 text-xs"
                        )}
                    >
                        {text}
                    </a>
                );
            })}
        </nav>
    );
}
