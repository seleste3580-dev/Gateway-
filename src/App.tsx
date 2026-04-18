import React, { useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithGoogle, 
  auth, 
  FirebaseUser,
  db 
} from "./lib/firebase";
import firebaseConfig from "../firebase-applet-config.json";
import { signOut } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc 
} from "firebase/firestore";
import { 
  Cpu, 
  Zap, 
  Layers, 
  History, 
  LogOut, 
  Plus, 
  Play, 
  Share2, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Settings,
  Key as KeyIcon,
  Copy,
  Trash2,
  RefreshCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CircuitBackground } from "./components/CircuitBackground";
import { cn } from "./lib/utils";
import { routeAI, AVAILABLE_MODELS, AIResponse } from "./lib/ai-service";
import { v4 as uuidv4 } from "uuid";

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  className, 
  variant = "primary",
  disabled,
  loading 
}: any) => {
  const variants: any = {
    primary: "bg-primary text-bg-dark hover:bg-opacity-90 font-semibold",
    secondary: "bg-transparent border border-border-dark hover:bg-border-dark text-gray-300",
    ghost: "hover:bg-border-dark text-gray-400 hover:text-white",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "px-4 py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
};

const ModelTag = ({ model, selected, onToggle }: any) => (
  <button
    onClick={onToggle}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-2",
      selected 
        ? "bg-primary/20 border-primary text-primary" 
        : "bg-bg-dark/40 border-border-dark text-gray-500 hover:border-gray-600"
    )}
  >
    <BrainCircuit className="w-3 h-3" />
    {model.name}
  </button>
);

const ExecutionCard = ({ execution }: { execution: any }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass p-5 rounded-xl flex flex-col gap-4 min-w-[300px] flex-1"
  >
    <div className="flex items-center justify-between border-b border-border-dark pb-3">
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          execution.status === "completed" ? "bg-primary" : "bg-yellow-500"
        )} />
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{execution.model}</span>
      </div>
      {execution.status === "completed" ? (
        <CheckCircle2 className="w-4 h-4 text-primary" />
      ) : execution.status === "error" ? (
        <XCircle className="w-4 h-4 text-red-500" />
      ) : (
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
      )}
    </div>
    
    <div className="flex-1">
      {execution.status === "pending" ? (
        <div className="h-20 flex items-center justify-center">
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-primary rounded-full"
              />
            ))}
          </div>
        </div>
      ) : (
        <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
          {execution.response || "No response received."}
        </pre>
      )}
    </div>
    
    {execution.metadata?.timeTaken && (
      <div className="mt-auto pt-3 border-t border-border-dark text-[10px] text-gray-500 flex justify-between">
        <span>LATENCY: {execution.metadata.timeTaken}ms</span>
        <span>TOKEN_USAGE: N/A</span>
      </div>
    )}
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lab"); // lab, history, pipeline, dev
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(["gemini-3-flash-preview"]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [routing, setRouting] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setApiKeys([]);
      return;
    }

    const qSessions = query(
      collection(db, "sessions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const qKeys = query(
      collection(db, "apiKeys"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubKeys = onSnapshot(qKeys, (snapshot) => {
      setApiKeys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSessions();
      unsubKeys();
    };
  }, [user]);

  useEffect(() => {
    if (!currentSession) {
      setExecutions([]);
      return;
    }

    const q = query(
      collection(db, "sessions", currentSession.id, "executions"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExecutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [currentSession]);

  const handleRoute = async () => {
    if (!prompt.trim() || selectedModels.length === 0 || !user) return;

    setRouting(true);
    
    try {
      // Create Session
      const sessionRef = await addDoc(collection(db, "sessions"), {
        userId: user.uid,
        name: prompt.slice(0, 30) + "...",
        type: "comparison",
        config: { models: selectedModels },
        createdAt: serverTimestamp()
      });
      
      const newSession = { id: sessionRef.id, prompt };
      setCurrentSession(newSession);

      // Route to each model
      const promises = selectedModels.map(async (modelId) => {
        const modelData = AVAILABLE_MODELS.find(m => m.id === modelId)!;
        const executionId = uuidv4();
        
        // Initial pending state
        const execRef = await addDoc(collection(db, "sessions", sessionRef.id, "executions"), {
          id: executionId,
          sessionId: sessionRef.id,
          userId: user.uid,
          prompt,
          model: modelData.id,
          provider: modelData.provider,
          status: "pending",
          timestamp: serverTimestamp()
        });

        const startTime = Date.now();
        try {
          const res = await routeAI({
            prompt,
            model: modelData.id,
            provider: modelData.provider as any
          });
          
          await updateDoc(doc(db, "sessions", sessionRef.id, "executions", execRef.id), {
            response: res.response,
            status: "completed",
            metadata: { timeTaken: Date.now() - startTime }
          });
        } catch (err: any) {
          await updateDoc(doc(db, "sessions", sessionRef.id, "executions", execRef.id), {
            response: `Error: ${err.message}`,
            status: "error",
            metadata: { timeTaken: Date.now() - startTime }
          });
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error("Routing error:", error);
    } finally {
      setRouting(false);
    }
  };

  const toggleModel = (id: string) => {
    setSelectedModels(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const generateApiKey = async () => {
    if (!user) return;
    try {
      const keyStr = `forge_${uuidv4().replace(/-/g, '')}`;
      await addDoc(collection(db, "apiKeys"), {
        userId: user.uid,
        key: keyStr,
        name: `Production Key ${apiKeys.length + 1}`,
        status: "active",
        createdAt: serverTimestamp(),
        lastUsed: null
      });
    } catch (err) {
      console.error("Error generating key:", err);
    }
  };

  const deleteApiKey = async (id: string) => {
    // Implement delete logic using updateDoc to revoke or use deleteDoc
    try {
      await updateDoc(doc(db, "apiKeys", id), {
        status: "revoked"
      });
    } catch (err) {
      console.error("Error revoking key:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopying(id);
    setTimeout(() => setCopying(null), 2000);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <CircuitBackground />
      
      {/* Header */}
      <header className="h-16 glass border-b border-border-dark flex items-center justify-between px-6 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cpu className="w-6 h-6 text-primary neon-glow" />
          </div>
          <h1 className="text-xl font-bold tracking-tight neon-text">AI FORGE <span className="text-gray-500 font-normal">GATEWAY</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {!user ? (
              <Button onClick={signInWithGoogle}>Sign In with Google</Button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium">{user.displayName}</span>
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">OPERATOR_AUTHENTICATED</span>
                </div>
                <img 
                  referrerPolicy="no-referrer"
                  src={user.photoURL || ""} 
                  className="w-8 h-8 rounded-full border border-primary/30" 
                  alt="Avatar" 
                />
                <Button variant="ghost" onClick={() => signOut(auth)} className="p-2">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-16 md:w-64 glass border-r border-border-dark flex flex-col p-4 gap-2 z-10">
          <Button 
            variant={activeTab === "lab" ? "secondary" : "ghost"} 
            className="justify-start px-3"
            onClick={() => setActiveTab("lab")}
          >
            <Cpu className="w-5 h-5 text-primary" />
            <span className="hidden md:block">Neural Lab</span>
          </Button>
          <Button 
            variant={activeTab === "dev" ? "secondary" : "ghost"} 
            className="justify-start px-3"
            onClick={() => setActiveTab("dev")}
          >
            <KeyIcon className="w-5 h-5 text-accent" />
            <span className="hidden md:block">Developers</span>
          </Button>
          <div className="mt-8 mb-2 px-2 hidden md:block">
            <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest font-bold">Session History</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentSession(s);
                  setActiveTab("lab");
                }}
                className={cn(
                  "w-full text-left p-2 rounded-lg text-xs hover:bg-border-dark transition-colors mb-1 truncate",
                  currentSession?.id === s.id ? "bg-border-dark text-primary" : "text-gray-500"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-border-dark">
            <Button variant="ghost" className="w-full justify-start px-3">
              <Settings className="w-5 h-5" />
              <span className="hidden md:block">Settings</span>
            </Button>
          </div>
        </nav>

        {/* Workspace */}
        <section className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
          {!user ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md text-center flex flex-col items-center gap-6">
                <div className="p-8 bg-primary/5 rounded-full relative">
                  <BrainCircuit className="w-16 h-16 text-primary neon-glow" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-dashed border-primary/20 rounded-full"
                  />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">Initialize Gateway</h2>
                  <p className="text-gray-500 leading-relaxed">
                    Operative authorization required to access neural routing infrastructure. Connect your credentials to begin.
                  </p>
                </div>
                <Button onClick={signInWithGoogle} className="px-8 py-3 text-lg">
                  Establish Connection
                </Button>
              </div>
            </div>
          ) : activeTab === "lab" ? (
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-8 h-full">
              {/* Prompt Interface */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-mono tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> PROMPT_INPUT_BUFFER
                  </h2>
                  <div className="flex gap-2">
                    {AVAILABLE_MODELS.map(m => (
                      <ModelTag 
                        key={m.id} 
                        model={m} 
                        selected={selectedModels.includes(m.id)}
                        onToggle={() => toggleModel(m.id)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="relative group">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter command or natural language instruction..."
                    className="w-full h-32 bg-card-dark/40 border border-border-dark rounded-xl p-5 font-mono text-sm focus:outline-none focus:border-primary/50 transition-all resize-none glass"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-3">
                    <Button 
                      onClick={handleRoute} 
                      loading={routing}
                      disabled={!prompt.trim() || selectedModels.length === 0}
                      className="px-6"
                    >
                      Process Routing <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Response Grid */}
              <div className="flex-1 min-h-0">
                <AnimatePresence mode="popLayout">
                  {executions.length > 0 ? (
                    <motion.div 
                      key={currentSession?.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min"
                    >
                      {executions.map(exec => (
                        <div key={exec.id}>
                          <ExecutionCard execution={exec} />
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
                      <History className="w-20 h-20 mb-4" />
                      <p className="font-mono uppercase tracking-[0.3em]">Buffer Empty</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : activeTab === "dev" ? (
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                   <KeyIcon className="text-accent" /> API Gateways
                  </h2>
                  <p className="text-sm text-gray-500 font-mono mt-1">PROGRAMMATIC_ACCESS_PORTAL_V1</p>
                </div>
                <Button onClick={generateApiKey}>
                  <Plus className="w-4 h-4" /> Generate New Key
                </Button>
              </div>

              <div className="grid gap-4">
                {apiKeys.map(k => (
                  <motion.div 
                    layout
                    key={k.id} 
                    className={cn(
                      "glass p-6 rounded-xl border flex items-center justify-between",
                      k.status === "revoked" ? "opacity-50 grayscale" : ""
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{k.name}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded uppercase tracking-widest",
                          k.status === "active" ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-500"
                        )}>
                          {k.status}
                        </span>
                      </div>
                      <code className="text-xs bg-black/40 px-2 py-1 rounded text-gray-400 font-mono flex items-center gap-2">
                        {k.key}
                        <button 
                          onClick={() => copyToClipboard(k.key, k.id)} 
                          className="hover:text-primary transition-colors"
                        >
                          {copying === k.id ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </code>
                      <span className="text-[10px] text-gray-600 font-mono">CREATED: {new Date(k.createdAt?.seconds * 1000).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {k.status === "active" && (
                        <Button 
                          variant="danger" 
                          className="p-2"
                          onClick={() => deleteApiKey(k.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {apiKeys.length === 0 && (
                  <div className="text-center py-20 glass rounded-2xl border-dashed">
                    <KeyIcon className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500">No active keys found. Deploy your first key to begin building.</p>
                  </div>
                )}
              </div>

              <div className="glass p-8 rounded-2xl border-accent/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4 text-accent" /> Integration Guide
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-black/40 rounded-lg font-mono text-sm">
                    <p className="text-primary"># Process neural routing via API</p>
                    <p className="text-gray-400">curl -X POST {window.location.origin}/api/route-ai \</p>
                    <p className="text-gray-400">  -H "x-forge-key: YOUR_API_KEY" \</p>
                    <p className="text-gray-400">  -H "Content-Type: application/json" \</p>
                    <p className="text-gray-400">  -d '{"{"} "prompt": "Hello Forge", "model": "gemini-3-flash-preview" {"}"}'</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 font-mono">
              <p className="flex items-center gap-2">
                <Layers className="w-5 h-5" /> PIPELINE_INFRASTRUCTURE_UNDER_MAINTENANCE
              </p>
            </div>
          )}
        </section>
      </main>
      
      {/* Footer Status */}
      <footer className="h-8 glass border-t border-border-dark flex items-center px-6 justify-between text-[10px] font-mono text-gray-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            SYSTEM_STABLE
          </span>
          <span>LATENCY: 42MS</span>
          <span>UPTIME: 99.9%</span>
        </div>
        <div className="flex gap-4">
          <span>REGION: {firebaseConfig.firestoreDatabaseId.split('-')[1]}</span>
          <span>V0.8.4_ALPHA</span>
        </div>
      </footer>
    </div>
  );
}
