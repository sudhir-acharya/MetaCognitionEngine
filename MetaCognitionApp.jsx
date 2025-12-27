import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Users, 
  Gavel, 
  Sparkles, 
  MessageSquare, 
  ArrowRight, 
  ShieldAlert, 
  ScrollText,
  Activity,
  Bot
} from 'lucide-react';

// --- API HANDLING ---
// In a real production app, this would be a backend call to LangGraph.
// Here, we simulate the "Chain of Debate" by chaining Gemini API calls on the client.

const generateContent = async (apiKey, prompt, systemInstruction) => {
  if (!apiKey) throw new Error("API Key is missing");
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
      }),
    }
  );

  if (!response.ok) throw new Error("Failed to fetch response");
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
};

// --- COMPONENTS ---

const AgentCard = ({ name, role, icon: Icon, color, content, status }) => (
  <div className={`flex flex-col h-full bg-slate-900 border ${status === 'active' ? `border-${color}-500 shadow-[0_0_15px_rgba(var(--${color}-500),0.3)]` : 'border-slate-700'} rounded-xl overflow-hidden transition-all duration-300`}>
    <div className={`p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-500/20 text-${color}-400`}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-100 text-sm">{name}</h3>
          <p className="text-xs text-slate-400 uppercase tracking-wider">{role}</p>
        </div>
      </div>
      {status === 'thinking' && <Activity className={`animate-pulse text-${color}-400`} size={18} />}
      {status === 'done' && <div className={`h-2 w-2 rounded-full bg-${color}-500`} />}
    </div>
    <div className="p-4 overflow-y-auto h-64 text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
      {status === 'waiting' ? (
        <span className="text-slate-600 italic">Waiting for assignment...</span>
      ) : status === 'thinking' ? (
        <span className={`text-${color}-400 animate-pulse`}>Analyzing decision vectors...</span>
      ) : (
        content
      )}
    </div>
  </div>
);

const FrameworkSelector = ({ selected, onSelect }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
    <button
      onClick={() => onSelect('council')}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected === 'council' 
          ? 'border-blue-500 bg-blue-500/10' 
          : 'border-slate-700 hover:border-slate-600 bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Users className={selected === 'council' ? 'text-blue-400' : 'text-slate-400'} />
        <h3 className="font-bold text-white">The AI Council</h3>
      </div>
      <p className="text-sm text-slate-400">Parallel debate. Three distinct personalities (Optimist, Skeptic, Realist) argue their case, followed by a Chairman's synthesis.</p>
    </button>

    <button
      onClick={() => onSelect('dxo')}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected === 'dxo' 
          ? 'border-purple-500 bg-purple-500/10' 
          : 'border-slate-700 hover:border-slate-600 bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Brain className={selected === 'dxo' ? 'text-purple-400' : 'text-slate-400'} />
        <h3 className="font-bold text-white">DxO Protocol</h3>
      </div>
      <p className="text-sm text-slate-400">Sequential refinement. Lead Researcher finds facts → Critical Reviewer attacks bias → Final synthesis. Best for deep topics.</p>
    </button>
  </div>
);

export default function DecisionEngine() {
  const [query, setQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [framework, setFramework] = useState('council');
  
  // Agent States
  const [agentA, setAgentA] = useState({ status: 'waiting', content: '' });
  const [agentB, setAgentB] = useState({ status: 'waiting', content: '' });
  const [agentC, setAgentC] = useState({ status: 'waiting', content: '' });
  const [chairman, setChairman] = useState({ status: 'waiting', content: '' });

  // --- ENGINE LOGIC ---

  const runCouncil = async () => {
    // 1. Reset
    setAgentA({ status: 'thinking', content: '' });
    setAgentB({ status: 'thinking', content: '' });
    setAgentC({ status: 'thinking', content: '' });
    setChairman({ status: 'waiting', content: '' });

    try {
      // 2. Parallel Execution (The Debate)
      const [resA, resB, resC] = await Promise.all([
        generateContent(apiKey, query, "You are 'The Visionary'. You are optimistic, creative, and look for high-risk high-reward potential. You focus on future possibilities."),
        generateContent(apiKey, query, "You are 'The Skeptic'. Your job is to find flaws. Look for recency bias, logical gaps, and risks. Be critical and harsh."),
        generateContent(apiKey, query, "You are 'The Historian'. You focus purely on data, past precedents, and statistical facts. Ignore emotions. Be dry and analytical.")
      ]);

      setAgentA({ status: 'done', content: resA });
      setAgentB({ status: 'done', content: resB });
      setAgentC({ status: 'done', content: resC });

      // 3. Synthesis
      setChairman({ status: 'thinking', content: '' });
      const synthesisPrompt = `
        You are the Chairman of the AI Council.
        Review the following arguments regarding: "${query}"

        THE VISIONARY (Optimist):
        ${resA}

        THE SKEPTIC (Critic):
        ${resB}

        THE HISTORIAN (Data):
        ${resC}

        Synthesize these viewpoints into a final decision. Acknowledge the debate points but be decisive.
      `;
      const resChair = await generateContent(apiKey, synthesisPrompt, "You are a decisive leader synthesizing advice from your council.");
      setChairman({ status: 'done', content: resChair });

    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    }
  };

  const runDxO = async () => {
    // 1. Reset
    setAgentA({ status: 'thinking', content: '' }); // Lead Researcher
    setAgentB({ status: 'waiting', content: '' });  // Critical Reviewer
    setAgentC({ status: 'waiting', content: '' });  // (Not used in simple DxO, or used as Analyst)
    setChairman({ status: 'waiting', content: '' });

    try {
      // Step 1: Lead Researcher
      const research = await generateContent(apiKey, query, "You are a Lead Researcher. Conduct a breadth-first search of this topic. Provide extensive details, context, and pros/cons. Be exhaustive.");
      setAgentA({ status: 'done', content: research });

      // Step 2: Critical Reviewer
      setAgentB({ status: 'thinking', content: '' });
      const critiquePrompt = `
        Review the following research report for specific biases:
        1. Recency Bias (Overweighting recent events)
        2. Era Bias (Comparing things unfairly across time)
        3. Confirmation Bias.

        Research Report:
        ${research}
      `;
      const critique = await generateContent(apiKey, critiquePrompt, "You are a Critical Reviewer. You do not generate ideas. You only critique methods and logic.");
      setAgentB({ status: 'done', content: critique });

      // Step 3: Synthesis
      setChairman({ status: 'thinking', content: '' });
      const finalPrompt = `
        Original Query: ${query}
        
        Initial Research: ${research}
        
        Critical Review: ${critique}
        
        Provide the final answer, correcting the initial research based on the critique.
      `;
      const finalRes = await generateContent(apiKey, finalPrompt, "You are the Final Decision Maker.");
      setChairman({ status: 'done', content: finalRes });
      setAgentC({ status: 'done', content: "Protocol skipped for 2-step DxO (Research -> Critique -> Synthesis)" });

    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    }
  };

  const handleStart = async () => {
    if (!query) return;
    if (!apiKey) {
      alert("Please enter a Gemini API Key to run the simulation.");
      return;
    }
    setIsProcessing(true);
    
    if (framework === 'council') {
      await runCouncil();
    } else {
      await runDxO();
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <Bot className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Metacognition Engine
              </h1>
              <p className="text-xs text-slate-400">Based on Satya Nadella's "Chain of Debate"</p>
            </div>
          </div>
          <div className="flex gap-2">
             <input 
              type="password" 
              placeholder="Gemini API Key"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs w-32 focus:w-64 transition-all focus:outline-none focus:border-blue-500"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Input Section */}
        <section className="mb-12 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-slate-100">What decision needs a council?</h2>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-slate-900 rounded-xl p-2 flex gap-2 shadow-2xl">
              <input 
                type="text"
                placeholder="e.g., Who is the best cricket captain of all time? or Should I invest in AI stocks?"
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 text-white placeholder-slate-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
              <button 
                onClick={handleStart}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Debating...' : 'Convening Council'} 
                {!isProcessing && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </section>

        {/* Framework Selection */}
        <section className="mb-12">
          <FrameworkSelector selected={framework} onSelect={setFramework} />
        </section>

        {/* The Council / Debate Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Agent 1 */}
          <AgentCard 
            name={framework === 'council' ? "The Visionary" : "Lead Researcher"} 
            role={framework === 'council' ? "Optimist & Creative" : "Breadth-First Search"}
            icon={Sparkles} 
            color="yellow"
            status={agentA.status}
            content={agentA.content}
          />
          
          {/* Agent 2 */}
          <AgentCard 
            name={framework === 'council' ? "The Skeptic" : "Critical Reviewer"} 
            role={framework === 'council' ? "Critic & Risk Analyst" : "Method & Bias Check"}
            icon={ShieldAlert} 
            color="red"
            status={agentB.status}
            content={agentB.content}
          />
          
          {/* Agent 3 */}
          <AgentCard 
            name={framework === 'council' ? "The Historian" : "Data Analyst"} 
            role={framework === 'council' ? "Data & Precedent" : "Protocol Observer"}
            icon={ScrollText} 
            color="emerald"
            status={agentC.status}
            content={agentC.content}
          />
        </div>

        {/* Chairman / Synthesis */}
        <div className="relative">
          <div className="absolute left-1/2 -top-6 -translate-x-1/2 bg-slate-900 border border-slate-700 px-4 py-1 rounded-full text-xs text-slate-400 z-10 uppercase tracking-widest font-bold">
            Final Synthesis
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-8 relative overflow-hidden">
            {chairman.status === 'thinking' && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center flex-col gap-4">
                <Activity className="animate-pulse text-purple-500" size={48} />
                <p className="text-purple-300 font-mono animate-pulse">Synthesizing arguments...</p>
              </div>
            )}
            
            <div className="flex items-start gap-6">
              <div className="p-4 bg-purple-600/20 rounded-2xl text-purple-400 hidden md:block">
                <Gavel size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Chairman's Verdict</h3>
                <div className="prose prose-invert max-w-none text-slate-300">
                  {chairman.content ? (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {chairman.content}
                    </div>
                  ) : (
                    <p className="text-slate-600 italic">Run the council to generate a verdict.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
