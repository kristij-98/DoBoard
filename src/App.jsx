import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Calendar, User, AlignLeft, Clock, Loader2, Sparkles, 
  MoreHorizontal, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, X, Trash2, ChevronRight, LayoutGrid 
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

// --- STYLES (Notion Colors) ---
const COLUMNS = [
  { id: 'todo', label: 'To Do', badge: 'bg-gray-200 text-gray-700' },
  { id: 'doing', label: 'In Progress', badge: 'bg-blue-100 text-blue-700' },
  { id: 'feedback', label: 'Feedback', badge: 'bg-orange-100 text-orange-800' },
  { id: 'done', label: 'Done', badge: 'bg-green-100 text-green-800' }
];

// --- RICH TEXT EDITOR (Fixed Lists & Headings) ---
const RichTextEditor = ({ initialValue, onChange }) => {
  const editorRef = useRef(null);

  // We use onMouseDown + preventDefault to keep focus in the editor while clicking buttons
  const applyFormat = (e, command, value = null) => {
    e.preventDefault(); 
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  useEffect(() => {
    // Only update innerHTML if it's significantly different to prevent cursor jumps
    if (editorRef.current && initialValue !== editorRef.current.innerHTML) {
        // Simple check to avoid overwriting ongoing typing with same data
        if (initialValue === '' && editorRef.current.innerHTML === '<br>') return;
        editorRef.current.innerHTML = initialValue || '';
    }
  }, [initialValue]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white focus-within:ring-1 focus-within:ring-gray-400 transition-all shadow-sm">
      {/* Internal CSS to force list styles that Tailwind usually resets */}
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
        {/* Basic Text Formatting */}
        <button onMouseDown={(e) => applyFormat(e, 'bold')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Bold"><Bold size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'italic')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Italic"><Italic size={14}/></button>
        
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        
        {/* Headings */}
        <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H1')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors flex items-center gap-1 font-bold text-xs" title="Heading 1"><Heading1 size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H2')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors flex items-center gap-1 font-bold text-xs" title="Heading 2"><Heading2 size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'formatBlock', 'H3')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors flex items-center gap-1 font-bold text-xs" title="Heading 3"><Heading3 size={14}/></button>
        
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        
        {/* Lists */}
        <button onMouseDown={(e) => applyFormat(e, 'insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Bullet List"><List size={14}/></button>
        <button onMouseDown={(e) => applyFormat(e, 'insertOrderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Numbered List"><ListOrdered size={14}/></button>
      </div>
      
      <div 
        ref={editorRef} 
        contentEditable 
        className="editor-content p-4 min-h-[150px] outline-none text-gray-800 cursor-text text-sm leading-relaxed" 
        onInput={handleInput} 
      />
    </div>
  );
};

// --- EMPTY STATE ---
const EmptyState = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-700">
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-gray-400">
        <LayoutGrid size={24} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Your board is empty</h2>
      <p className="text-gray-500 text-sm mb-6">Track your projects by adding tasks to the board.</p>
      <button onClick={onCreate} className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm">
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

  useEffect(() => {
    signInAnonymously(auth).catch((e) => alert("Auth Error: " + e.message));
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, COLLECTION_NAME));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      taskList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(taskList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveTask = async () => {
    if (!user) { alert("Not logged in!"); return; }
    
    const title = document.getElementById('modal-title')?.value || "Untitled";
    const client = document.getElementById('modal-client')?.value || "";
    const deadline = document.getElementById('modal-date')?.value || "";
    const status = document.getElementById('modal-status')?.value || "todo";
    
    try {
      const collectionRef = collection(db, COLLECTION_NAME);
      const finalData = { 
        title, client, deadline, status, 
        brief: editorContent 
      };

      if (editingTask?.id) {
        await updateDoc(doc(db, COLLECTION_NAME, editingTask.id), finalData);
      } else {
        await addDoc(collectionRef, { ...finalData, createdAt: serverTimestamp(), createdBy: user.uid });
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    await deleteDoc(doc(db, COLLECTION_NAME, taskId));
    setIsModalOpen(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    await updateDoc(doc(db, COLLECTION_NAME, taskId), { status: newStatus });
  };

  const onDragStart = (e, taskId) => e.dataTransfer.setData("taskId", taskId);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e, status) => {
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) handleStatusChange(taskId, status);
  };

  const openNewTask = () => { setEditingTask(null); setEditorContent(''); setIsModalOpen(true); };
  const openEditTask = (task) => { setEditingTask(task); setEditorContent(task.brief || ''); setIsModalOpen(true); }

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans flex flex-col text-[#37352F]">
      
      {/* HEADER */}
      <header className="px-8 py-6 flex items-center justify-between sticky top-0 z-20 bg-[#F7F7F5]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-md font-bold text-lg">D</div>
          <h1 className="text-xl font-bold tracking-tight">DoBoard</h1>
        </div>
        <button 
          onClick={openNewTask} 
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={16} /> New
        </button>
      </header>

      {/* BOARD CONTENT */}
      <main className="flex-1 px-8 pb-8 overflow-x-auto overflow-y-hidden">
        {loading ? (
           <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={32}/></div>
        ) : tasks.length === 0 ? (
           <EmptyState onCreate={openNewTask} />
        ) : (
          <div className="flex gap-6 h-full min-w-[1000px]">
            {COLUMNS.map(col => (
              <div 
                key={col.id} 
                className="flex-1 flex flex-col min-w-[260px] h-full"
                onDragOver={onDragOver} 
                onDrop={(e) => onDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${col.badge}`}>
                      {col.label}
                    </span>
                    <span className="text-gray-400 text-xs font-medium ml-1">
                      {tasks.filter(t => t.status === col.id).length}
                    </span>
                  </div>
                  <div className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-gray-400 hover:text-gray-600">
                    <Plus size={14} onClick={openNewTask}/>
                  </div>
                </div>

                {/* Drop Zone */}
                <div className="flex-1 overflow-y-auto pb-20 pr-2">
                  {tasks.filter(t => t.status === col.id).map(task => (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onClick={() => openEditTask(task)}
                      className="group bg-white p-4 rounded-lg shadow-sm border border-[#E9E9E7] hover:bg-gray-50 mb-3 cursor-pointer transition-all relative"
                    >
                      <h3 className="font-medium text-gray-800 mb-2 leading-snug pr-4">{task.title}</h3>
                      
                      {/* Properties */}
                      <div className="space-y-2">
                        {task.client && (
                          <div className="flex items-center text-xs text-gray-500">
                            <User size={12} className="mr-1.5 text-gray-400" />
                            <span className="truncate max-w-[150px]">{task.client}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className={`flex items-center text-xs ${new Date(task.deadline) < new Date() && col.id !== 'done' ? 'text-red-500' : 'text-gray-500'}`}>
                            <Clock size={12} className="mr-1.5 opacity-70" />
                            {new Date(task.deadline).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </div>
                        )}
                      </div>

                      {/* Hover Grip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 text-gray-300">
                        <MoreHorizontal size={14} />
                      </div>
                    </div>
                  ))}
                  
                  {/* Quick Add Button */}
                  <div 
                    onClick={openNewTask}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-md cursor-pointer transition-colors text-sm mt-1"
                  >
                    <Plus size={14} /> New
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#191919]/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-gray-400">Project</span>
                <ChevronRight size={14} />
                <span className="text-gray-900 font-medium">{COLUMNS.find(c => c.id === (editingTask?.status || 'todo'))?.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {editingTask && (
                   <button onClick={() => handleDeleteTask(editingTask.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                     <Trash2 size={16} />
                   </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <input 
                id="modal-title"
                type="text" 
                placeholder="Untitled" 
                defaultValue={editingTask?.title}
                autoFocus
                className="w-full text-3xl font-bold text-gray-900 border-none focus:ring-0 p-0 mb-6 placeholder:text-gray-300 bg-transparent"
              />

              <div className="grid grid-cols-1 gap-4 mb-8">
                {/* Client Property */}
                <div className="flex items-center gap-4 group">
                  <div className="w-24 text-sm text-gray-500 flex items-center gap-2"><User size={14}/> Client</div>
                  <input 
                    id="modal-client" 
                    type="text" 
                    placeholder="Empty" 
                    defaultValue={editingTask?.client} 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1.5 rounded hover:bg-gray-50 transition-colors text-gray-800 placeholder:text-gray-300"
                  />
                </div>

                {/* Due Date Property */}
                <div className="flex items-center gap-4 group">
                  <div className="w-24 text-sm text-gray-500 flex items-center gap-2"><Calendar size={14}/> Due Date</div>
                  <input 
                    id="modal-date" 
                    type="date" 
                    defaultValue={editingTask?.deadline} 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1.5 rounded hover:bg-gray-50 transition-colors text-gray-800 placeholder:text-gray-300"
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3 text-sm">
                  <AlignLeft size={16} /> Description
                </div>
                <RichTextEditor initialValue={editorContent} onChange={setEditorContent} />
              </div>

              {/* Hidden Status Selector */}
              <select id="modal-status" className="hidden" defaultValue={editingTask?.status || 'todo'}>
                 {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-md transition-colors">Cancel</button>
              <button 
                type="button" 
                onClick={handleSaveTask} 
                className="px-6 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
