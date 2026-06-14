"use client";

import { useState } from 'react';
import Input from '@/components/Input';
import { socialLinks } from '@/config/socials';

export default function ContactPage() {
  const [statusNotification, setStatusNotification] = useState({ text: '', type: 'default' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const customSocialChannels = [
    {
      identity: "Email Identity", value: "meher@smsram.dedyn.io", actionText: "Compose Mail", href: socialLinks.gmail, accentColor: "#EA4335",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
    },
    {
      identity: "YouTube Hub", value: "SMSRam Broadcasts", actionText: "Watch Streams", href: socialLinks.youtube, accentColor: "#FF0000",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
    },
    {
      identity: "GitHub Registry", value: "github.com/smsram", actionText: "View Code", href: socialLinks.github, accentColor: "#888888",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.061.069-.061 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
    },
    {
      identity: "LeetCode Space", value: "leetcode.com/smsram", actionText: "View Profile", href: socialLinks.leetcode, accentColor: "#FFA116",
      svg: <svg className="w-5 h-5" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><g><path fill="#FFA116" d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.645 1.837-.645s1.357.195 1.823.662l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.055 5.055 0 0 0-2.445-1.337l2.467-2.503c.516-.514.498-1.366-.037-1.901-.535-.535-1.387-.552-1.902-.038l-10.1 10.101c-.981.982-1.494 2.337-1.494 3.835 0 1.498.513 2.895 1.494 3.875l4.347 4.361c.981.979 2.337 1.452 3.834 1.452s2.853-.512 3.835-1.494l2.609-2.637c.514-.514.496-1.365-.039-1.9s-1.386-.553-1.899-.039z"></path><path fill="#FFB84D" d="M20.811 13.01H10.666c-.702 0-1.27.604-1.27 1.346s.568 1.346 1.27 1.346h10.145c.701 0 1.27-.604 1.27-1.346s-.569-1.346-1.27-1.346z"></path></g></svg>
    },
    {
      identity: "LinkedIn Network", value: "linkedin.com/in/smsram", actionText: "Connect", href: socialLinks.linkedin, accentColor: "#0A66C2",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    },
    {
      identity: "Twitter / X Profile", value: "@smsram", actionText: "Follow", href: socialLinks.twitter, accentColor: "#888888",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.005 4.15H5.059z"/></svg>
    },
    {
      identity: "WhatsApp Link", value: "Direct Message", actionText: "Open Chat", href: socialLinks.whatsapp, accentColor: "#25D366",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    },
    {
      identity: "Telegram Channel", value: "t.me/smsram", actionText: "Open App", href: socialLinks.telegram, accentColor: "#24A1DE",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.96 6.507-1.35 8.614-.17.89-.5 1.19-.81 1.22-.69.06-1.21-.46-1.88-.9-1.05-.69-1.64-1.12-2.66-1.79-1.18-.77-.41-1.19.26-1.88.17-.18 3.23-2.96 3.29-3.21.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.92 1.22-5.43 3.59-.51.35-.98.53-1.4.52-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.41-1.4-.87.03-.24.36-.49.99-.74 3.88-1.69 6.46-2.8 7.74-3.33 3.69-1.52 4.45-1.79 4.95-1.8 1.1.01.35.64.26 1.42z"/></svg>
    },
    {
      identity: "Discord Handle", value: socialLinks.discord, actionText: "Copy Username", isCopyOnly: true, accentColor: "#5865F2",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 01.078.009c.12.099.246.195.373.289a.075.075 0 01-.006.127 12.298 12.298 0 01-1.873.894.077.077 0 01-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084-.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/></svg>
    },
    {
      identity: "Instagram Profile", value: "smsram1", actionText: "View Photos", href: socialLinks.instagram, accentColor: "#E1306C",
      svg: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
    }
  ];

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    
    setIsSubmitting(true);
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';

    try {
      // 🟢 UPDATED ENDPOINT PATH VECTOR: Points cleanly to /api/mail/contact
      const response = await fetch(`${serverUrl}/api/mail/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatusNotification({ text: "Transmission successfully routed.", type: 'success' });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatusNotification({ text: "Signal dropped. Connection failure.", type: 'error' });
      }
    } catch (err) {
      setStatusNotification({ text: "Server unreachable. Try direct mail.", type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusNotification({ text: '', type: 'default' }), 5000);
    }
  };

  const executeClipboardAction = (text, elementTitle) => {
    navigator.clipboard.writeText(text);
    setStatusNotification({ text: `Copied ${elementTitle} to clipboard`, type: 'success' });
    setTimeout(() => setStatusNotification({ text: '', type: 'default' }), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-12 animate-in fade-in duration-300 font-display" style={{ padding: '40px' }}>
      <div className="mx-auto flex flex-col" style={{ maxWidth: '800px', gap: '32px' }}>
        
        {/* Header Block */}
        <div style={{ display: 'block' }} className="text-left">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary tracking-tight">Connection Node</h2>
          <p className="text-on-surface-variant font-body-sm text-sm mt-1 opacity-80">
            Establish communication via secure transmission or explore active social media directories below
          </p>
        </div>

        {/* Status Notification Element */}
        {statusNotification.text && (
          <div className={`w-full font-code text-xs py-3 px-4 rounded-md text-left uppercase tracking-wider font-bold animate-in slide-in-from-top-2 border ${
            statusNotification.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'
          }`}>
            Status: {statusNotification.text}
          </div>
        )}

        {/* MESSAGE FORM SECTION */}
        <div style={{ display: 'block' }} className="w-full bg-surface-container-lowest border border-outline-variant rounded-md p-6 sm:p-8 shadow-sm text-left">
          <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-3 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-orange" />
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-primary">Direct Message Portal</h3>
          </div>
          
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input 
                label="Your Name" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your name..." 
              />
              <Input 
                label="Return Email Address" 
                type="email"
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Where should I reply?" 
              />
            </div>
            
            <Input 
              label="Transmission Subject" 
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="Topic of discussion..." 
            />
            
            <div style={{ display: 'block' }} className="flex flex-col gap-1.5 w-full">
              <label className="text-[11px] text-on-surface-variant uppercase tracking-widest font-bold">Message Details</label>
              <textarea 
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Type your message description here..."
                className="w-full bg-surface-container text-primary border border-outline-variant rounded px-4 py-3 font-body text-[15px] outline-none transition-all focus:border-outline shadow-xs resize-y"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ height: '44px', backgroundColor: isSubmitting ? 'var(--color-surface-container)' : 'var(--color-accent-orange)' }}
              className="w-full text-white font-display text-xs uppercase tracking-widest font-bold rounded shadow-md transition-all active:scale-[0.99] hover:opacity-90 cursor-pointer border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Transmitting Data...' : 'Submit Message'}
            </button>
          </form>
        </div>

        {/* SOCIAL LINKS DIRECTORY SECTION */}
        <div style={{ display: 'block' }} className="w-full">
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-4 text-left">Social Media Profiles</h3>
          <div style={{ display: 'block' }} className="flex flex-col gap-3">
            {customSocialChannels.map((channel, idx) => (
              <div 
                key={idx}
                style={{ display: 'flex' }}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-md p-4 items-center justify-between gap-md shadow-sm group hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors text-left flex-col sm:flex-row min-w-0"
              >
                <div style={{ display: 'flex' }} className="items-center gap-4 min-w-0 flex-1 w-full">
                  <div 
                    style={{ backgroundColor: `${channel.accentColor}10`, color: channel.accentColor, borderColor: `${channel.accentColor}25` }}
                    className="w-10 h-10 rounded-md border flex items-center justify-center shrink-0"
                  >
                    {channel.svg}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-code uppercase tracking-wider text-on-surface-variant opacity-80">{channel.identity}</div>
                    <div className="text-sm font-bold text-primary font-display mt-0.5 truncate">{channel.value}</div>
                  </div>
                </div>

                <div style={{ display: 'flex' }} className="items-center gap-2 shrink-0 w-full sm:w-auto justify-end mt-3 sm:mt-0">
                  {channel.isCopyOnly ? (
                    <button
                      type="button"
                      onClick={() => executeClipboardAction(channel.value, "Username")}
                      className="px-4 h-9 bg-surface border border-outline-variant rounded text-primary font-code text-xs uppercase tracking-wider hover:bg-surface-container-low transition-colors font-bold cursor-pointer outline-none"
                    >
                      {channel.actionText}
                    </button>
                  ) : (
                    <a
                      href={channel.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', height: '36px' }}
                      className="px-4 items-center gap-1.5 bg-surface border border-outline-variant rounded text-primary font-code text-xs uppercase tracking-wider hover:bg-surface-container-low transition-colors font-bold cursor-pointer no-underline"
                    >
                      <span>{channel.actionText}</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}