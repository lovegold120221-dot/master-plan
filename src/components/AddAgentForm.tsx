import React, { useState, useRef } from 'react';
import { Plus, Upload, X, FileText, Link as LinkIcon, Mic, MessageSquare, User, Briefcase, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Agent, KnowledgeFile } from '../types';
import { cn } from '../lib/utils';

interface AddAgentFormProps {
  onAdd: (agent: Agent) => void;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
const TONES = ['Professional', 'Friendly', 'Analytical', 'Enthusiastic', 'Sarcastic', 'Empathetic', 'Authoritative'];

export const AddAgentForm: React.FC<AddAgentFormProps> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [voice, setVoice] = useState(VOICES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (uploadedFiles) {
      Array.from(uploadedFiles).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newFile: KnowledgeFile = {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: file.type,
            size: file.size,
            content: reader.result as string
          };
          setFiles(prev => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !description) return;

    const newAgent: Agent = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      role,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      expertise: role,
      voicePrompt: `${description}. Your tone should be ${tone}.`,
      powerLevel: 80,
      status: 'idle',
      isHandRaised: false,
      isFavorite: false,
      isSelected: false,
      initial: name.charAt(0).toUpperCase(),
      avatar: avatar || undefined,
      tone,
      voice,
      knowledgeBase: {
        files: files.length > 0 ? files : undefined,
        url: url || undefined
      }
    };

    onAdd(newAgent);
    resetForm();
    setIsOpen(false);
  };

  const resetForm = () => {
    setName('');
    setRole('');
    setDescription('');
    setVoice(VOICES[0]);
    setTone(TONES[0]);
    setAvatar(null);
    setUrl('');
    setFiles([]);
  };

  return (
    <div className="mb-6">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Create New Agent</span>
        </button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Agent Configuration</h3>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-all overflow-hidden relative group"
                >
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">Avatar</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Agent Name"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Profession</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="text" 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. UX Designer"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Agent Description (System Prompt)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Define the agent's personality, goals and behavior..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 min-h-[100px] resize-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Voice Profile</label>
                <div className="relative">
                  <Mic className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <select 
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 appearance-none"
                  >
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Communication Tone</label>
                <div className="relative">
                  <Settings2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 appearance-none"
                  >
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Knowledge Base (Optional)</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-zinc-800/50 transition-all"
                >
                  <FileText className="w-5 h-5 text-zinc-600" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Attach Files</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    multiple 
                    className="hidden" 
                  />
                </div>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    type="url" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Knowledge URL..."
                    className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                  />
                </div>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded-lg text-[10px] font-medium">
                      <FileText className="w-3 h-3 text-zinc-500" />
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button 
                        type="button"
                        onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 border border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-[2] py-3 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg"
              >
                Create Agent
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};
