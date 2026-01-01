import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type Post } from '../lib/supabase';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Clock, Share2, Printer, Heart, Link as LinkIcon, Twitter, Linkedin, MessageCircle, Download, ImageIcon, X, Loader2, Feather, User, Send, Check, Moon, Sun, RefreshCw, Maximize, Smartphone, Square, Layout, MousePointerClick, TextCursorInput } from 'lucide-react';
import { calculateReadingTime } from '../lib/utils';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/language';
import html2canvas from 'html2canvas';

type AspectRatio = 'auto' | 'portrait' | 'square' | 'story';

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
  const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
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
      
      const likedKey = `liked_post_${id}`;
      if (localStorage.getItem(likedKey)) setLiked(true);

      const viewedKey = `viewed_post_${id}`;
      if (!localStorage.getItem(viewedKey)) {
        await supabase.rpc('increment_view_count', { post_id: id });
        localStorage.setItem(viewedKey, 'true');
      }

      const { data } = await supabase.from('posts').select('*').eq('id', id).single();
      
      if (data) {
        setPost(data);
        setReadingTime(calculateReadingTime(data.content));
        // Initial excerpt is default, but will be overridden if selection exists when opening modal
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

  // Auto-grab selection when opening visual share
  useEffect(() => {
    if (showVisualShare && !isSelectingText) {
        const selection = window.getSelection()?.toString().trim();
        if (selection && selection.length > 0) {
            setCustomExcerpt(selection);
            toast(t('post.tip'), "info");
        }
    }
  }, [showVisualShare, isSelectingText]);

  // Construct the canonical URL for sharing
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
    if (!id || liked) return;
    setLiked(true);
    if (post) setPost({ ...post, likes: (post.likes || 0) + 1 });
    localStorage.setItem(`liked_post_${id}`, 'true');
    try { await supabase.rpc('increment_likes', { post_id: id }); } catch (error) { console.error(error); }
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

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    
    // Wait a moment for fonts/images to fully settle
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Higher scale for better quality
        backgroundColor: cardTheme === 'dark' ? '#18181B' : '#FAFAFA',
        useCORS: true,
        logging: false,
        allowTaint: true,
    });
    
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
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
            // Fallback if file sharing not supported
            handleNativeShare();
        }
    } catch (error) {
        console.error("Smart share failed", error);
        // Fallback
        handleNativeShare();
    } finally {
        setGeneratingImage(false);
    }
  };

  // Selection Mode Handler
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
                        disabled={liked}
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
                        <button 
                            onClick={() => setShowVisualShare(false)}
                            className="absolute -top-12 right-0 p-2 text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 rounded-full"
                        >
                            <X size={24} />
                        </button>

                        {/* Controls */}
                        <div className="w-full bg-card border border-border rounded-2xl p-5 mb-6 shadow-lg space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Theme Selector */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                        <Layout size={14} /> {t('post.cardTheme')}
                                    </span>
                                    <div className="flex bg-secondary rounded-lg p-1">
                                        <button 
                                            onClick={() => setCardTheme('light')}
                                            className={cn("flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2 text-xs font-bold", cardTheme === 'light' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                        >
                                            <Sun size={14} /> Light
                                        </button>
                                        <button 
                                            onClick={() => setCardTheme('dark')}
                                            className={cn("flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2 text-xs font-bold", cardTheme === 'dark' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                        >
                                            <Moon size={14} /> Dark
                                        </button>
                                    </div>
                                </div>

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
                            </div>
                            
                            {/* Text Editor */}
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

                        {/* The Card to be Captured */}
                        <div className="w-full flex justify-center overflow-hidden rounded-xl shadow-2xl border border-border/50">
                            <div 
                                ref={cardRef}
                                className={cn(
                                    "relative w-full flex flex-col p-8 md:p-12 justify-between transition-colors duration-300",
                                    cardTheme === 'dark' ? "bg-[#18181B] text-[#F4F4F5]" : "bg-[#FAFAFA] text-[#18181B]",
                                    aspectRatio === 'square' ? "aspect-square" : 
                                    aspectRatio === 'portrait' ? "aspect-[4/5]" : 
                                    aspectRatio === 'story' ? "aspect-[9/16]" : 
                                    "min-h-[500px] h-auto"
                                )}
                                style={{ fontFamily: 'Inter, sans-serif' }}
                            >
                                {/* Background Elements */}
                                {cardTheme === 'dark' ? (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#18181B] via-[#1c1c21] to-[#000000] z-0"></div>
                                        <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-[#C4B59D] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-[0.07]"></div>
                                        <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-[#C4B59D] rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none opacity-[0.05]"></div>
                                        <div className="absolute inset-4 md:inset-6 border border-[#C4B59D]/10 rounded-xl z-10 pointer-events-none"></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-[#FAFAFA] z-0"></div>
                                        <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-[#C4B59D] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-[0.15]"></div>
                                        <div className="absolute inset-4 md:inset-6 border border-[#18181B]/5 rounded-xl z-10 pointer-events-none"></div>
                                    </>
                                )}

                                {/* Header */}
                                <div className="relative z-20 pt-2 px-2">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border",
                                            cardTheme === 'dark' 
                                                ? "bg-[#C4B59D]/10 text-[#C4B59D] border-[#C4B59D]/20" 
                                                : "bg-[#18181B]/5 text-[#18181B] border-[#18181B]/10"
                                        )}>
                                            <Feather size={18} />
                                        </div>
                                        <div>
                                            <p className={cn(
                                                "text-[10px] font-bold uppercase tracking-[0.2em]",
                                                cardTheme === 'dark' ? "text-[#C4B59D]" : "text-[#18181B]"
                                            )}>Khaliq Repository</p>
                                            <p className={cn(
                                                "text-[8px] uppercase tracking-wider font-medium",
                                                cardTheme === 'dark' ? "text-white/40" : "text-black/40"
                                            )}>Digital Garden & Archive</p>
                                        </div>
                                    </div>

                                    <h2 className={cn(
                                        "text-3xl md:text-4xl font-serif font-bold leading-[1.2] mb-4 tracking-tight break-words whitespace-normal",
                                        cardTheme === 'dark' ? "text-[#F4F4F5]" : "text-[#18181B]"
                                    )}>
                                        {post.title}
                                    </h2>
                                </div>

                                {/* Content / Excerpt */}
                                <div className="relative z-20 px-2 flex-grow flex items-center py-6">
                                    <div className="relative w-full">
                                        <span className={cn(
                                            "absolute -top-6 -left-4 text-6xl font-serif leading-none select-none",
                                            cardTheme === 'dark' ? "text-[#C4B59D]/20" : "text-[#18181B]/10"
                                        )}>"</span>
                                        <p className={cn(
                                            "text-lg md:text-xl font-light leading-relaxed italic relative z-10 whitespace-pre-wrap break-words",
                                            cardTheme === 'dark' ? "text-[#A1A1AA]" : "text-[#52525B]"
                                        )}>
                                            {customExcerpt}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="relative z-20 pb-2 px-2 mt-auto">
                                    <div className={cn(
                                        "flex justify-between items-end border-t pt-6",
                                        cardTheme === 'dark' ? "border-[#C4B59D]/20" : "border-[#18181B]/10"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                                                cardTheme === 'dark' 
                                                    ? "bg-gradient-to-br from-[#C4B59D] to-[#8E7F65] text-[#18181B]" 
                                                    : "bg-[#18181B] text-[#FAFAFA]"
                                            )}>
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "font-bold text-xs md:text-sm tracking-wide",
                                                    cardTheme === 'dark' ? "text-[#F4F4F5]" : "text-[#18181B]"
                                                )}>Bias Fajar Khaliq</p>
                                                <p className={cn(
                                                    "text-[8px] md:text-[10px] uppercase tracking-wider font-medium",
                                                    cardTheme === 'dark' ? "text-[#C4B59D]" : "text-[#52525B]"
                                                )}>System Architecture</p>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <p className={cn(
                                                "text-[8px] md:text-[10px] uppercase tracking-wider mb-1 font-medium",
                                                cardTheme === 'dark' ? "text-white/40" : "text-black/40"
                                            )}>{format(new Date(post.created_at), 'MMMM d, yyyy')}</p>
                                            <div className={cn(
                                                "flex items-center justify-end gap-1.5",
                                                cardTheme === 'dark' ? "text-[#C4B59D]" : "text-[#18181B]"
                                            )}>
                                                <p className="text-[10px] md:text-xs font-bold">
                                                    {post.category || 'Research'} • {readingTime} min read
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex flex-col md:flex-row gap-4 w-full justify-center">
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
