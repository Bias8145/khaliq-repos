import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Layers, Terminal, User, GraduationCap, Github, Cpu, Database, Globe, Smartphone, ExternalLink, Feather, Share2, X, Layout, Sun, Moon, Maximize, Square, RefreshCw, Send, Loader2, Download, TrendingUp, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/language';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import { useToast } from '../components/ui/Toast';
import { supabase, type Post } from '../lib/supabase';

type AspectRatio = 'auto' | 'portrait' | 'square' | 'story';

export default function Home() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Promote Modal State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
  const [promoText, setPromoText] = useState(t('home.promote.defaultText'));
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Trending Posts
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchTrending = async () => {
        const { data } = await supabase
            .from('posts')
            .select('id, title, category, view_count')
            .eq('is_public', true)
            .order('view_count', { ascending: false })
            .limit(3);
        
        if (data) setTrendingPosts(data);
    };
    fetchTrending();
  }, []);

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for render
    const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: '#18181B', // Force dark background for consistency
        useCORS: true,
        logging: false,
        allowTaint: true,
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
  };

  const handleDownloadCard = async () => {
    setGenerating(true);
    try {
        const blob = await generateImageBlob();
        if (!blob) throw new Error("Failed to generate blob");
        const image = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = image;
        link.download = `khaliq-profile-card.png`;
        link.click();
        toast("Card saved successfully", "success");
    } catch (error) {
        console.error(error);
        toast("Failed to save card", "error");
    } finally {
        setGenerating(false);
    }
  };

  const handleSmartShare = async () => {
    setGenerating(true);
    try {
        const blob = await generateImageBlob();
        if (!blob) throw new Error("Failed to generate blob");
        const file = new File([blob], `khaliq-profile.png`, { type: 'image/png' });
        const shareData = {
            title: "Bias Fajar Khaliq | Repository",
            text: promoText,
            url: window.location.origin,
            files: [file]
        };
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast("Shared successfully", "success");
        } else {
            if (navigator.share) {
                await navigator.share({
                    title: "Bias Fajar Khaliq",
                    text: promoText,
                    url: window.location.origin
                });
            } else {
                navigator.clipboard.writeText(window.location.origin);
                toast("Link copied to clipboard", "success");
            }
        }
    } catch (error) {
        console.error(error);
        toast("Share failed", "error");
    } finally {
        setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 px-5 md:px-8 max-w-6xl mx-auto">
      
      {/* Hero Section - Redesigned (Elegant, Contained, No Underline) */}
      <section className="mb-20 md:mb-28 text-center md:text-left relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl mx-auto md:mx-0 relative z-10"
        >
          {/* Elegant Panel Container */}
          <div className="bg-card/40 backdrop-blur-sm border border-border/40 rounded-[32px] p-8 md:p-12 relative overflow-hidden shadow-2xl shadow-black/5">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -z-10"></div>

             <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-8 rounded-full bg-background/50 text-foreground text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase border border-border/50">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                {t('home.badge')}
             </div>
             
             <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-[1.1] tracking-tight">
                <span className="block text-foreground/90">{t('home.title')}</span>
                <span className="block font-serif italic text-primary mt-2 font-medium">
                    {t('home.titleHighlight')}
                </span>
             </h1>
             
             <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl font-light">
                {t('home.subtitle')}
             </p>
             
             <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <Link to="/repo" className="px-8 py-4 rounded-full bg-foreground text-background text-sm font-bold hover:bg-foreground/90 transition-all flex items-center gap-2 shadow-xl shadow-foreground/10 hover:-translate-y-1">
                  {t('home.explore')} <ArrowRight size={16} />
                </Link>
                <button 
                    onClick={() => setShowPromoteModal(true)}
                    className="px-8 py-4 rounded-full border border-border text-foreground text-sm font-bold hover:bg-secondary/50 transition-all backdrop-blur-sm flex items-center gap-2"
                >
                  <Share2 size={16} /> {t('home.promoteBtn')}
                </button>
             </div>
          </div>
        </motion.div>
      </section>

      {/* Trending Section */}
      {trendingPosts.length > 0 && (
        <section className="mb-20">
            <div className="flex items-center gap-2 mb-6 text-primary">
                <Flame size={20} className="fill-current" />
                <h2 className="text-sm font-bold uppercase tracking-widest">{t('home.trending')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trendingPosts.map((post, i) => (
                    <Link key={post.id} to={`/post/${post.id}`} className="group block">
                        <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 h-full flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                                    0{i+1} &mdash; {post.category}
                                </span>
                                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                    {post.title}
                                </h3>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                <TrendingUp size={14} /> {post.view_count} reads
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
      )}

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 md:mb-28">
        <FeatureCard 
            icon={<BookOpen size={24} />} 
            title={t('home.techResearch')} 
            desc={t('home.techResearchDesc')} 
            delay={0.1}
        />
        <FeatureCard 
            icon={<Terminal size={24} />} 
            title={t('home.sysDev')} 
            desc={t('home.sysDevDesc')} 
            delay={0.2}
        />
        <FeatureCard 
            icon={<Layers size={24} />} 
            title={t('home.criticalThought')} 
            desc={t('home.criticalThoughtDesc')} 
            delay={0.3}
        />
      </section>

      {/* About Section */}
      <section id="about" className="mb-24 scroll-mt-32">
        <div className="flex items-end justify-between mb-8 md:mb-10">
            <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">{t('home.aboutHeader')}</h2>
                <p className="text-muted-foreground text-sm md:text-base">{t('home.aboutSub')}</p>
            </div>
            <div className="hidden md:block h-px bg-border w-1/3 mb-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 h-auto md:h-[600px]">
            {/* Main Profile Card */}
            <div className="md:col-span-2 md:row-span-2 bg-card border border-border rounded-3xl p-6 md:p-10 relative overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Feather size={200} className="text-primary rotate-12" />
                </div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-secondary border border-primary/20 flex items-center justify-center text-primary relative overflow-hidden">
                                <User size={32} className="relative z-10" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-xs font-bold text-primary uppercase tracking-wider mt-1">{t('home.hello')}</span>
                            </div>
                        </div>

                        <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Bias Fajar Khaliq</h3>
                        <p className="text-lg md:text-xl text-primary font-medium mb-6">{t('home.role')}</p>
                        <p className="text-muted-foreground leading-relaxed text-base md:text-lg max-w-lg" dangerouslySetInnerHTML={{ __html: t('home.bio') }} />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-8">
                        <TechBadge icon={<Cpu size={14} />} label="AutoCAD" />
                        <TechBadge icon={<Database size={14} />} label="Data Analysis" />
                        <TechBadge icon={<Globe size={14} />} label="HSE Compliance" />
                        <TechBadge icon={<Smartphone size={14} />} label="Android Dev" />
                    </div>
                </div>
            </div>

            {/* Education Card */}
            <div className="bg-secondary/30 border border-border rounded-3xl p-6 md:p-8 flex flex-col justify-center hover:border-primary/30 transition-colors relative overflow-hidden group">
                <div className="absolute -bottom-4 -right-4 text-primary/10 group-hover:text-primary/20 transition-colors rotate-[-15deg]">
                    <GraduationCap size={120} />
                </div>
                
                <div className="relative z-10">
                    <h4 className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('home.education')}</h4>
                    <h3 className="text-lg md:text-xl font-bold text-foreground">Universitas Nusa Putra</h3>
                    <p className="text-foreground/80 text-sm mt-1 font-medium">{t('home.major')}</p>
                    <p className="text-primary font-bold text-xs mt-3 bg-primary/10 inline-block px-2 py-1 rounded-md">{t('home.classOf')} 2022</p>
                </div>
            </div>

            {/* Open Source / XDA Card */}
            <div className="bg-secondary/30 border border-border rounded-3xl p-6 md:p-8 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-4 right-4 text-primary/20 group-hover:text-primary/40 transition-colors">
                    <Terminal size={48} />
                </div>
                <div className="relative z-10">
                    <h4 className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('home.androidDev')}</h4>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <p className="text-xs font-bold text-primary mb-1">Pixel 6 Series</p>
                            <p className="text-sm text-foreground font-medium">Oriole, Raven, Bluejay</p>
                            <p className="text-[10px] text-muted-foreground">{t('home.kernelOpt')}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-primary mb-1">Pixel 4 Series</p>
                            <p className="text-sm text-foreground font-medium">Flame, Coral, Sunfish</p>
                            <p className="text-[10px] text-muted-foreground">{t('home.romMaintainer')}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <a href="https://xdaforums.com/m/khaliq-morpheus.13212421/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-foreground bg-background px-3 py-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors border border-border">
                            {t('home.xdaProfile')} <ExternalLink size={12} />
                        </a>
                        <a href="https://github.com/Bias8145" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-primary px-2 py-2 hover:underline">
                            GitHub
                        </a>
                    </div>
                </div>
            </div>

        </div>
      </section>

      {/* Promote Modal */}
      <AnimatePresence>
        {showPromoteModal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            >
                <div className="relative w-full max-w-2xl flex flex-col items-center my-auto">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-foreground">{t('home.promote.title')}</h2>
                        <p className="text-muted-foreground text-sm">{t('home.promote.desc')}</p>
                    </div>

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

                            {/* Text Editor */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-muted-foreground">{t('home.promote.customize')}</span>
                                    <button 
                                        onClick={() => setPromoText(t('home.promote.defaultText'))}
                                        className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:text-foreground"
                                    >
                                        <RefreshCw size={10} /> {t('post.reset')}
                                    </button>
                                </div>
                                <textarea 
                                    value={promoText}
                                    onChange={(e) => setPromoText(e.target.value)}
                                    className="w-full bg-secondary/50 border border-transparent rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-20"
                                    placeholder="Enter your promotional message..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* REBUILT SHARE CARD - Matching Reference Image */}
                    <div className="w-full flex justify-center mb-6">
                        <div 
                            ref={cardRef}
                            className={cn(
                                "relative w-full flex flex-col items-center justify-center text-center overflow-hidden bg-[#18181B] text-white p-12",
                                aspectRatio === 'square' ? "aspect-square" : 
                                aspectRatio === 'portrait' ? "aspect-[4/5]" : 
                                aspectRatio === 'story' ? "aspect-[9/16]" : 
                                "min-h-[500px] h-auto"
                            )}
                            style={{ 
                                borderRadius: '24px',
                                border: '1px solid #27272A',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            {/* Background Elements */}
                            <div className="absolute inset-0 bg-gradient-to-b from-[#27272A] to-[#18181B] opacity-50"></div>
                            
                            {/* Top Feather Icon */}
                            <div className="relative z-10 w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-8 bg-white/5 backdrop-blur-sm">
                                <Feather size={28} className="text-[#D4C5A9]" />
                            </div>

                            {/* Main Title */}
                            <h2 className="relative z-10 text-4xl md:text-5xl font-bold tracking-tight mb-2 text-white font-sans">
                                Bias Fajar Khaliq
                            </h2>
                            <p className="relative z-10 text-xs font-bold tracking-[0.3em] text-[#D4C5A9] uppercase mb-12">
                                Digital Garden & Archive
                            </p>

                            {/* Quote Section */}
                            <div className="relative z-10 max-w-lg mx-auto">
                                <p className="text-lg md:text-xl leading-relaxed text-gray-300 font-serif italic">
                                    "{promoText}"
                                </p>
                            </div>

                            {/* Footer / URL */}
                            <div className="relative z-10 mt-16 pt-8 border-t border-white/10 w-full max-w-xs flex items-center justify-center gap-2">
                                <Globe size={14} className="text-[#D4C5A9]" />
                                <span className="text-xs font-bold tracking-widest text-[#D4C5A9] uppercase">
                                    khaliq-repos.pages.dev
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
                        <button 
                            onClick={handleSmartShare}
                            disabled={generating}
                            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-3 text-sm"
                        >
                            {generating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {t('home.promote.share')}
                        </button>
                        
                        <button 
                            onClick={handleDownloadCard}
                            disabled={generating}
                            className="px-8 py-4 bg-secondary text-foreground font-bold rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-3 text-sm"
                        >
                            {generating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {t('home.promote.download')}
                        </button>

                        <button 
                            onClick={() => setShowPromoteModal(false)}
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
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
    return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay, duration: 0.5 }}
          className="p-6 md:p-8 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all group"
        >
          <div className="w-12 h-12 md:w-14 md:h-14 bg-secondary rounded-2xl flex items-center justify-center text-foreground mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-sm">
            {icon}
          </div>
          <h3 className="text-lg md:text-xl font-bold mb-3 font-serif">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {desc}
          </p>
        </motion.div>
    )
}

function TechBadge({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] md:text-xs font-bold text-foreground">
            {icon} {label}
        </span>
    )
}
