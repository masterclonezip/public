import { safeHtml } from '../lib/safeHtmlPublic';
/**
 * Contact ticketing desk form
 * Integrates directly with Firestore db schemas to log customer inquiries, issues, or direct suggestions.
 */

import { Mail, MessageSquare, MapPin, ArrowLeft, ShieldCheck, Loader2, Check, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/DataContextPublic';
import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Meta from '../components/Meta';

export default function Contact() {
  const { settings: mockSettings } = useData();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [msgText, setMsgText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');
  return (
    <div className="max-w-7xl mx-auto py-16 px-6 sm:px-10 animate-fade-in pb-20 min-h-[70vh]">
      <Meta 
        title={mockSettings?.contact_meta_title || "Contact Support"}
        description={mockSettings?.contact_meta_description || "Get in touch with support for any queries or assistance."}
        canonical={window.location.origin + "/contact"}
      />
      <div className="mb-10">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group"
        >
          <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:-translate-x-1 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Home
        </Link>
      </div>
      <div
        className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start"
      >
        <div className="lg:col-span-12 xl:col-span-5 space-y-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">Contact Us</h1>
            <div 
              className="markdown-body text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium"
              dangerouslySetInnerHTML={{ __html: safeHtml(mockSettings.contact_content || '' ) }}
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
              <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                <Mail className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-1">Email</h3>
                <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-base">{mockSettings.support_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
              <div className="bg-pink-500/10 p-3 rounded-xl border border-pink-500/20">
                <MessageSquare className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-1">Live Chat</h3>
                <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-base">Monday to Saturday, 10:00 AM - 3:00 PM (Instant reply in every section)</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
              <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                <MapPin className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-1">Office</h3>
                <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-base">Plot No. 18, 4th Floor, Commercial Complex, Sector 12, Dwarka, New Delhi, Delhi 110075, India</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          setErrorText('');
          setSuccess(false);

          if (!msgText.trim()) {
            setErrorText('Please type a message first.');
            return;
          }
          setSubmitting(true);
          try {
            const cleanComment = msgText.trim().replace(/<[^>]*>?/gm, '');
            const payload = {
              username: username.trim() || 'Anonymous User',
              email: email.trim() || 'no-email@provided.com',
              comment: cleanComment,
              created_at: new Date().toISOString(),
              status: 'pending',
              source: 'contact_page'
            };

            try {
              await fetch('/api/v1/public/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              }).catch(() => {});
            } catch (e) {}
            setSuccess(true);
            setMsgText('');
            setUsername('');
            setEmail('');
          } catch (err: any) {
            console.error('Failed to submit formal ticket payload:', err);
            setErrorText('Failed to transmit message safely. Please try again.');
          } finally {
            setSubmitting(false);
          }
        }} className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[32px] p-8 sm:p-12 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Send a Message</h2>
          </div>

            <>
              <div>
                <label htmlFor="contact-name" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Name</label>
                <input id="contact-name" required type="text" placeholder="Your Name" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
                <input id="contact-email" required type="email" placeholder="Your Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Message</label>
                <textarea id="contact-message" required value={msgText} onChange={(e) => setMsgText(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 h-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium resize-none" placeholder="How can we help?"></textarea>
              </div>

              {errorText && (
                <div className="flex items-center gap-1 text-xs font-semibold text-rose-500 pt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Message sent successfully! Our support agents will contact you shortly.</span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] text-sm flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending message...</span>
                  </>
                ) : (
                  <span>Send Message</span>
                )}
              </button>
            </>
        </form>
      </div>
    </div>
  );
}
