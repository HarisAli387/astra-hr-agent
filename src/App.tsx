import React, { useState } from 'react';
import { SignedIn, SignedOut, SignIn, UserButton, SignUp } from '@clerk/clerk-react';
import { UploadCloud, CheckCircle, FileText, Calendar, Loader2, Sparkles, AlertCircle, Trash2 } from 'lucide-react';

interface Candidate {
  id: string;
  candidateName: string;
  candidateEmail: string;
  skillsDetected: string[];
  matchScore: number;
  aiSummary: string;
}

export default function App() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-[#e0e0e0] flex flex-col">
      <header className="h-20 border-b border-zinc-800 px-8 bg-zinc-900/10 flex items-center justify-between sticky top-0 z-10 w-full">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-serif tracking-tight text-white italic">Astra.HR</h1>
          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-wider rounded uppercase">Agent Active</span>
        </div>
        <div>
          <SignedOut>
            <div className="flex space-x-3">
              <button 
                onClick={() => setAuthMode('signin')}
                className={`px-4 py-2 text-xs font-bold rounded transition-colors ${authMode === 'signin' ? 'bg-white text-black hover:bg-zinc-200' : 'border border-zinc-700 text-white hover:bg-zinc-800'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setAuthMode('signup')}
                className={`px-4 py-2 text-xs font-bold rounded transition-colors ${authMode === 'signup' ? 'bg-white text-black hover:bg-zinc-200' : 'border border-zinc-700 text-white hover:bg-zinc-800'}`}
              >
                Sign Up
              </button>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-8 w-full max-w-7xl mx-auto">
        <SignedOut>
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="max-w-md w-full bg-zinc-900/40 p-8 rounded-2xl border border-zinc-800 flex flex-col items-center">
              <h2 className="text-2xl font-serif mb-2 text-center text-white">Welcome Context</h2>
              <p className="text-zinc-500 mb-8 text-center text-sm leading-relaxed">
                Authenticate to access the agent workspace.
              </p>
              <div className="bg-white p-4 rounded-xl w-full">
                {authMode === 'signin' ? <SignIn routing="hash" /> : <SignUp routing="hash" />}
              </div>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <Dashboard />
        </SignedIn>
      </main>
    </div>
  );
}

function Dashboard() {
  const [jobDescription, setJobDescription] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorPrompt, setErrorPrompt] = useState<string | null>(null);
  const [candidateEmailInput, setCandidateEmailInput] = useState('');
  
  // Scheduling States
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!jobDescription.trim()) {
      setErrorPrompt('Please enter a Job Description first so we can score the candidates correctly.');
      e.target.value = ''; // reset file input
      return;
    }

    setErrorPrompt(null);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('cvFile', file);
    formData.append('jobDescription', jobDescription);
    if (candidateEmailInput) {
      formData.append('candidateEmail', candidateEmailInput);
    }

    try {
      const response = await fetch('/api/screen-cv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process CV');
      }

      const data = await response.json();
      
      const newCandidate: Candidate = {
        id: Math.random().toString(36).substring(7),
        ...data
      };

      setCandidates(prev => [...prev, newCandidate].sort((a, b) => b.matchScore - a.matchScore)); // Keep highest scores at top
    } catch (err: any) {
      console.error(err);
      setErrorPrompt(err.message || 'Error communicating with the screening agent.');
    } finally {
      setIsProcessing(false);
      e.target.value = ''; // reset file input
    }
  };

  const handleOpenScheduleModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setScheduleSuccess(null);
    setInterviewDate('');
    setInterviewTime('');
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setIsScheduling(true);
    setScheduleSuccess(null);
    setErrorPrompt(null);

    try {
      const response = await fetch('/api/schedule-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateEmail: selectedCandidate.candidateEmail,
          candidateName: selectedCandidate.candidateName,
          date: interviewDate,
          time: interviewTime
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule the interview.');
      }

      setScheduleSuccess(`Interview scheduled and email sent to ${selectedCandidate.candidateEmail}!`);
      setTimeout(() => setScheduleModalOpen(false), 3000);
    } catch (err: any) {
      setErrorPrompt(err.message || 'Error scheduling interview. Check your SMTP settings.');
    } finally {
      setIsScheduling(false);
    }
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column - Setup */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#e0e0e0] flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            Job Description
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
            Paste the requirements and core skills
          </p>
          <textarea 
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full h-48 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-600 focus:outline-none transition-all text-sm resize-none text-[#e0e0e0] placeholder-zinc-600"
            placeholder="e.g. We are looking for a Senior Python Developer with experience building AI agents and working with LLMs..."
          />
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#e0e0e0] flex items-center gap-2 mb-2">
            <UploadCloud className="w-4 h-4 text-zinc-400" />
            Candidate Information & CV
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
            Upload PDF or TXT for AI parsing
          </p>

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Candidate Email (Optional)</label>
            <input 
              type="email" 
              value={candidateEmailInput}
              onChange={(e) => setCandidateEmailInput(e.target.value)}
              placeholder="Enter email to notify candidate"
              className="w-full p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-[#e0e0e0] focus:ring-1 focus:ring-zinc-600 focus:outline-none transition-all placeholder-zinc-600"
            />
          </div>
          
          <label className={`w-full group flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl transition-all ${isProcessing ? 'border-zinc-800 bg-zinc-900/20 cursor-not-allowed' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30 cursor-pointer'}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-zinc-500 animate-spin mb-2" />
              ) : (
                <UploadCloud className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors mb-2" />
              )}
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-2">
                {isProcessing ? 'Agent is reviewing...' : 'Click to upload CV'}
              </p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.txt" 
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
          </label>

          {errorPrompt && (
            <div className="mt-4 p-3 bg-red-500/10 text-red-400 text-xs font-mono rounded border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorPrompt}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="lg:col-span-8">
        <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl min-h-[500px] flex flex-col">
          <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Top Ranked Candidates</h3>
            <div className="text-[10px] text-zinc-500 font-mono">{candidates.length} Scored</div>
          </div>

          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <CheckCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-mono">No candidates screened</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="relative group p-5 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-all flex flex-col md:flex-row gap-6">
                  <div className="shrink-0 flex flex-col items-center justify-center w-24">
                    <div className="text-3xl font-serif text-white">{candidate.matchScore}%</div>
                    <span className={`text-[10px] mt-1 font-bold tracking-widest uppercase ${
                        candidate.matchScore >= 80 ? 'text-emerald-400' : 
                        candidate.matchScore >= 50 ? 'text-yellow-500' : 
                        'text-red-400'
                    }`}>Match</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-medium text-white">{candidate.candidateName}</h3>
                        <a href={`mailto:${candidate.candidateEmail}`} className="text-[10px] text-zinc-500 font-mono hover:text-zinc-300">
                          {candidate.candidateEmail}
                        </a>
                      </div>
                      <button 
                        onClick={() => removeCandidate(candidate.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1 md:opacity-0 md:group-hover:opacity-100"
                        title="Remove Candidate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                      {candidate.aiSummary}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-wrap gap-2">
                        {candidate.skillsDetected.map((skill, i) => (
                          <span key={i} className="bg-zinc-800/50 text-zinc-300 px-2 py-1 rounded text-[10px] uppercase tracking-wider border border-zinc-700/50">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleOpenScheduleModal(candidate)}
                        disabled={candidate.candidateEmail === 'Not Provided' || candidate.candidateEmail.includes('Unknown')}
                        className="text-[10px] uppercase tracking-widest border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Schedule
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {scheduleModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-serif text-white mb-1">Schedule Interview</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6">Agent dispatch to {selectedCandidate.candidateName}</p>

            {scheduleSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{scheduleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Target Email</label>
                <input 
                  type="email" 
                  value={selectedCandidate.candidateEmail} 
                  disabled
                  className="w-full p-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-[#e0e0e0] focus:ring-1 focus:ring-zinc-600 focus:outline-none transition-all [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Time</label>
                  <input 
                    type="time" 
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-[#e0e0e0] focus:ring-1 focus:ring-zinc-600 focus:outline-none transition-all [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-zinc-800">
                <button 
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded border border-zinc-700 text-white font-bold text-xs hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isScheduling || !!scheduleSuccess}
                  className="flex-1 py-2.5 rounded bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                  {isScheduling && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isScheduling ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
