'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import { assistantService } from '@/services/assistantService';

import { useAppStore } from '@/store/useAppStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isFallback?: boolean;
}

export function AssistantPanel() {
  const alerts = useAppStore(state => state.alerts);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'I am the NORTHLINK AI Intelligence Assistant. How can I help you analyze the current logistics network?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track previous alerts length to detect new ones
  const prevAlertsLen = useRef(alerts.length);

  useEffect(() => {
    fetch('/api/assistant')
      .then(response => response.json())
      .then(data => setGeminiConfigured(Boolean(data.configured)))
      .catch(() => setGeminiConfigured(false));
  }, []);

  useEffect(() => {
    if (alerts.length > prevAlertsLen.current) {
      const newAlert = alerts[0]; // newest is at index 0
      if (newAlert.title === 'Mid-Journey Disruption Detected') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ **ALERT:** ${newAlert.message}\n\nI have recalculated the candidate routes. The previous optimal route is now compromised. Please review the Route Comparison panel for new options.`,
          isFallback: false
        }]);
      }
    }
    prevAlertsLen.current = alerts.length;
  }, [alerts]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await assistantService.askQuestion(text);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        isFallback: response.isFallback
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'An error occurred while connecting to the intelligence engine.',
        isFallback: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Why was this route selected?",
    "Summarize active incidents",
    "Generate operational briefing"
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-purple-500/20 rounded-xl overflow-hidden relative">
      <div className="p-3 border-b border-purple-900/30 bg-purple-950/20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-slate-200">NORTHLINK AI</h3>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${geminiConfigured ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400' : 'bg-amber-950/40 border border-amber-900/50 text-amber-400'}`}>
          <Sparkles className="w-3 h-3" />
          <span>{geminiConfigured === null ? 'Checking' : geminiConfigured ? 'Gemini Online' : 'Local Fallback'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
              <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
              }`}>
                {msg.content}
              </div>
              
              {msg.isFallback && (
                <span className="text-[10px] text-amber-500 mt-1 italic">
                  Local fallback mode active
                </span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800 p-3 rounded-lg rounded-tl-none border border-slate-700/50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-sm text-slate-400">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-3 py-1 bg-slate-800 hover:bg-purple-900/30 border border-slate-700 hover:border-purple-500/50 text-slate-300 text-xs rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about routing or incidents..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
