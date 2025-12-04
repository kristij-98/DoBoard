import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Calendar, User, AlignLeft, Clock, Loader2, Sparkles, 
  MoreHorizontal, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, X, Trash2, ChevronRight, LayoutGrid, Lock, Pin, PinOff
} from 'lucide-react';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyC2P7U9sDxQTEjdku4A6dKA3OaOqXxwo_4",
  authDomain: "doboard-449ba.firebaseapp.com",
  projectId: "doboard-449ba",
  storageBucket: "doboard-449ba.firebasestorage.app",
  messagingSenderId: "237145709336",
  appId: "1:237145709336:web:469136848f63b71bcd9c6d",
  measurementId: "G-RGC4XWECHW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION_NAME = 'doboard_tasks';
const CORRECT_PIN = "1912";

// --- STYLES ---
const COLUMNS = [
  { id: 'todo', label: 'To Do', badge: 'bg-gray-200 text-gray-700' },
  { id: 'doing', label: 'In Progress', badge: 'bg-blue-100 text-blue-700' },
  { id: 'feedback', label: 'Feedback', badge: 'bg-orange-100 text-orange-800' },
  { id: 'done', label: 'Done', badge: 'bg-green-100 text-green-800' }
];

// --- COMPONENTS ---

// 1. PIN MODAL
const PinModal = ({ isOpen, onClose, onConfirm }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      onConfirm();
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
            <Lock size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Enter Security PIN</h3>
          <p className="text-sm text-gray-500">Authorization required for this action.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            placeholder="****"
            className={`w-full text-center text-2xl tracking-widest font-bold py-3 border-2 rounded-lg outline-none focus:outline-none transition-all ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 focus:border-black'}`}
            maxLength={4}
          />
          {error && <p className="text-red-500 text-xs text-center mt-2 font-medium">Incorrect PIN</p>}
          
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. RICH TEXT EDITOR
const RichTextEditor = ({ initialValue, onChange }) => {
  const editorRef = useRef(null);

  const applyFormat = (e, command, value = null) => {
    e.preventDefault(); 
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  useEffect(() => {
    if (editorRef.current && initialValue !== editorRef.current.innerHTML) {
        if (initialValue === '' && editorRef.current.innerHTML === '<br>') return;
        editorRef.current.innerHTML = initialValue || '';
    }
  }, [initialValue]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white focus-within:ring-1 focus-within:ring-gray-400 transition-all shadow-sm">
      <style>{`
        .editor-content ul { list-style-type: disc; margin-left: 1.25rem; padding-left: 1rem; margin-bottom: 0.5rem; }
        .editor-content ol { list-style-type: decimal; margin-left: 1.25rem; padding-left: 1rem; margin-bottom: 0.5rem; }
        .editor-content h1 { font-size: 1.5em; font-weight: 700; margin-top: 0.5em; margin-bottom: 0.25em; line-height: 1.2; }
        .editor-content h2 { font-size: 1.25em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.25em; line-height: 1.2; }
        .editor-content h3 { font-size: 1.1em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.25em; }
        .editor-content p { margin-bottom: 0.5rem; }
        .editor-content b, .editor-content strong { font-weight: 700; }
        .editor-content i, .editor-content em { font-style: italic; }
      `}</style>

      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
        <button onMouseDown={(e) => applyFormat(e, 'bold')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Bold"><Bold size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'italic')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Italic"><Italic size={14}/></button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H1')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors flex items-center gap-1 font-bold text-xs" title="Heading 1"><Heading1 size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H2')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors flex items-center gap-1 font-bold text-xs" title="Heading 2"><Heading2 size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H3')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors flex items-center gap-1 font-bold text-xs" title="Heading 3"><Heading3 size={14}/></button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button onMouseDown={(e) => applyFormat(e, 'insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Bullet List"><List size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'insertOrderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Numbered List"><ListOrdered size={14}/></button>
      </div>
      
      <div 
        ref={editorRef} 
        contentEditable 
        className="editor-content p-4 min-h-[150px] outline-none focus:outline-none text-gray-800 cursor-text text-sm leading-relaxed" 
        onInput={handleInput} 
      />
    </div>
  );
};

// 3. EMPTY STATE
const EmptyState = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-700 px-4">
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-gray-400">
        <LayoutGrid size={24} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Your board is empty</h2>
      <p className="text-gray-500 text-sm mb-6">Track your projects by adding tasks to the board.</p>
      <button onClick={onCreate} className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm">
        Create First Task
      </button>
    </div>
  </div>
);

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  useEffect(() => {
    signInAnonymously(auth).catch((e) => alert("Auth Error: " + e.message));
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, COLLECTION_NAME));
    
    // --- SORTING LOGIC ---
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      taskList.sort((a, b) => {
        // 1. Pinned items first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // 2. Deadline Sorting (Ascending - Earliest date first)
        // If deadline is missing, treat it as very far in future (bottom of list)
        const dateA = a.deadline ? a.deadline : '9999-12-31';
        const dateB = b.deadline ? b.deadline : '9999-12-31';
        
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        
        return 0;
      });
      
      setTasks(taskList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const requirePin = (actionCallback) => {
    setPendingAction(() => actionCallback);
    setIsPinModalOpen(true);
  };

  const handlePinSuccess = () => {
    if (pendingAction) pendingAction();
    setPendingAction(null);
  };

  const performSave = async () => {
    if (!user) return;
    const title = document.getElementById('modal-title')?.value || "Untitled";
    const client = document.getElementById('modal-client')?.value || "";
    const deadline = document.getElementById('modal-date')?.value || "";
    const status = document.getElementById('modal-status')?.value || "todo";
    
    try {
      const collectionRef = collection(db, COLLECTION_NAME);
      const finalData = { title, client, deadline, status, brief: editorContent };

      if (editingTask?.id) {
        await updateDoc(doc(db, COLLECTION_NAME, editingTask.id), finalData);
      } else {
        await addDoc(collectionRef, { 
          ...finalData, 
          createdAt: serverTimestamp(), 
          createdBy: user.uid,
          isPinned: false
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  const performDelete = async (taskId) => {
    await deleteDoc(doc(db, COLLECTION_NAME, taskId));
    setIsModalOpen(false);
  };

  const togglePinTask = async (task) => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, task.id), { isPinned: !task.isPinned });
    } catch (error) {
      console.error("Error pinning", error);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const draggedTaskId = e.dataTransfer.getData("taskId");
    if (!draggedTaskId) return;

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    
    // Only update if status changed (Column changed)
    // We removed manual reordering logic; sorting is now purely by date/pin
    if (draggedTask && draggedTask.status !== targetStatus) {
       try {
         await updateDoc(doc(db, COLLECTION_NAME, draggedTaskId), { status: targetStatus });
       } catch (err) { console.error("Move failed", err); }
    }
  };

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const openNewTask = () => { setEditingTask(null); setEditorContent(''); setIsModalOpen(true); };
  const openEditTask = (task) => { setEditingTask(task); setEditorContent(task.brief || ''); setIsModalOpen(true); }

  return (
    <div 
      className="min-h-screen font-sans flex flex-col text-[#37352F]"
      style={{
        backgroundColor: '#F7F7F5',
        backgroundImage: 'radial-gradient(#D3D3D3 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <header className="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between sticky top-0 z-20 bg-[#F7F7F5]/90 backdrop-blur-sm border-b border-transparent md:border-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-md font-bold text-lg shadow-sm">D</div>
          <h1 className="text-xl font-bold tracking-tight hidden md:block">DoBoard</h1>
        </div>
        <button onClick={openNewTask} className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 active:scale-95">
          <Plus size={16} /> <span className="hidden sm:inline">New Task</span><span className="sm:hidden">New</span>
        </button>
      </header>

      <main className="flex-1 px-4 md:px-8 pb-8 overflow-x-auto overflow-y-hidden touch-pan-x">
        {loading ? (
           <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={32}/></div>
        ) : tasks.length === 0 ? (
           <EmptyState onCreate={openNewTask} />
        ) : (
          <div className="flex gap-4 md:gap-6 h-full min-w-[300px] md:min-w-[1000px] pb-4">
            {COLUMNS.map(col => (
              <div 
                key={col.id} 
                className="flex-none w-[85vw] sm:w-[300px] md:flex-1 flex flex-col h-full snap-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-[#F7F7F5]/80 backdrop-blur-sm z-10 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${col.badge}`}>{col.label}</span>
                    <span className="text-gray-400 text-xs font-medium ml-1">{tasks.filter(t => t.status === col.id).length}</span>
                  </div>
                  <div className="md:opacity-0 md:hover:opacity-100 transition-opacity cursor-pointer text-gray-400 hover:text-gray-600 p-1">
                    <Plus size={16} onClick={openNewTask}/>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-20 pr-1 scrollbar-hide">
                  {tasks.filter(t => t.status === col.id).map(task => (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.stopPropagation(); handleDrop(e, col.id, task.id); }}
                      onClick={() => openEditTask(task)}
                      className={`group bg-white p-4 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] border hover:bg-gray-50 active:scale-[0.98] mb-3 cursor-pointer transition-all relative ${task.isPinned ? 'border-blue-200 ring-1 ring-blue-100' : 'border-[#E9E9E7]'}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {/* Pin Icon - LEFT side */}
                        {task.isPinned && <Pin size={14} className="text-blue-500 fill-blue-500 rotate-45 shrink-0 mt-1" />}
                        <h3 className="font-medium text-gray-800 leading-snug text-sm md:text-base flex-1 pr-6">{task.title}</h3>
                      </div>
                      
                      <div className="space-y-2">
                        {task.client && (
                          <div className="flex items-center text-xs text-gray-500">
                            <User size={12} className="mr-1.5 text-gray-400 shrink-0" /><span className="truncate max-w-[150px]">{task.client}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className={`flex items-center text-xs ${new Date(task.deadline) < new Date() && col.id !== 'done' ? 'text-red-500' : 'text-gray-500'}`}>
                            <Clock size={12} className="mr-1.5 opacity-70 shrink-0" />
                            {new Date(task.deadline).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </div>
                        )}
                      </div>

                      {/* THREE DOTS MENU TRIGGER - Top Right */}
                      <div className="hidden md:block opacity-0 group-hover:opacity-100 absolute top-3 right-3" onClick={(e) => { e.stopPropagation(); setActiveMenuId(task.id); }}>
                        <div className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors">
                           <MoreHorizontal size={16} />
                        </div>
                      </div>

                      {/* POPUP MENU */}
                      {activeMenuId === task.id && (
                        <div className="absolute right-2 top-8 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { togglePinTask(task); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            {task.isPinned ? <><PinOff size={14}/> Unpin</> : <><Pin size={14}/> Pin to Top</>}
                          </button>
                          <div className="h-px bg-gray-100 my-1"></div>
                          <button onClick={() => { requirePin(() => performDelete(task.id)); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 size={14}/> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-md cursor-pointer transition-colors text-sm mt-1 select-none" onClick={openNewTask}>
                    <Plus size={14} /> New
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-white md:bg-transparent">
          <div className="absolute inset-0 bg-[#191919]/60 backdrop-blur-sm transition-opacity hidden md:block" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full md:max-w-2xl md:rounded-xl shadow-none md:shadow-2xl overflow-hidden flex flex-col h-full md:max-h-[90vh] animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-gray-400 hidden sm:inline">Project</span>
                <ChevronRight size={14} className="hidden sm:inline" />
                <span className="text-gray-900 font-medium px-2 py-1 bg-gray-100 rounded text-xs uppercase tracking-wide">{COLUMNS.find(c => c.id === (editingTask?.status || 'todo'))?.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {editingTask && <button onClick={() => requirePin(() => performDelete(editingTask.id))} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={18} /></button>}
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"><X size={22} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <input id="modal-title" type="text" placeholder="Untitled Task" defaultValue={editingTask?.title} autoFocus className="w-full text-2xl md:text-3xl font-bold text-gray-900 border-none focus:ring-0 focus:outline-none p-0 mb-6 placeholder:text-gray-300 bg-transparent"/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
                <div className="flex items-center gap-3 group bg-gray-50/50 p-2 rounded-lg md:bg-transparent md:p-0">
                  <div className="w-20 md:w-24 text-xs font-medium text-gray-500 flex items-center gap-2 uppercase tracking-wide"><User size={14}/> Client</div>
                  <input id="modal-client" type="text" placeholder="Empty" defaultValue={editingTask?.client} className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm p-1 md:p-1.5 rounded hover:bg-gray-50 transition-colors text-gray-800 placeholder:text-gray-300"/>
                </div>
                <div className="flex items-center gap-3 group bg-gray-50/50 p-2 rounded-lg md:bg-transparent md:p-0">
                  <div className="w-20 md:w-24 text-xs font-medium text-gray-500 flex items-center gap-2 uppercase tracking-wide"><Calendar size={14}/> Due Date</div>
                  <input id="modal-date" type="date" defaultValue={editingTask?.deadline} className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm p-1 md:p-1.5 rounded hover:bg-gray-50 transition-colors text-gray-800 placeholder:text-gray-300"/>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3 text-sm"><AlignLeft size={16} /> Description</div>
                <RichTextEditor initialValue={editorContent} onChange={setEditorContent} />
              </div>
              <select id="modal-status" className="hidden" defaultValue={editingTask?.status || 'todo'}>{COLUMNS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}</select>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 safe-area-bottom">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={() => requirePin(performSave)} className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 shadow-sm transition-all active:scale-95">Save Task</button>
            </div>
          </div>
        </div>
      )}
      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onConfirm={handlePinSuccess} />
    </div>
  );
}
