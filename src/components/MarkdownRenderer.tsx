import React from 'react';

export const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;

  // Improved renderer with clean, simple typography (Inter)
  // Added 'text-justify' and 'leading-relaxed' for auto-adjust neatness
  const htmlContent = content
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl md:text-4xl font-bold text-foreground mt-10 mb-6 pb-2 border-b border-border tracking-tight">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl md:text-3xl font-bold text-foreground mt-10 mb-4 tracking-tight">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl md:text-2xl font-semibold text-foreground mt-8 mb-3 tracking-tight">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em class="italic text-muted-foreground">$1</em>')
    .replace(/<u>(.*)<\/u>/gim, '<u class="decoration-primary/50 decoration-2 underline-offset-4">$1</u>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc marker:text-primary pl-2 mb-2 text-justify">$1</li>')
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-6 py-2 bg-secondary/20 rounded-r-lg">$1</blockquote>')
    .replace(/\n/gim, '<br />');

  // Added 'text-justify' class to the main container for neat alignment
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} className="prose-invert leading-relaxed text-foreground/90 text-lg max-w-none font-sans text-justify" />;
};
