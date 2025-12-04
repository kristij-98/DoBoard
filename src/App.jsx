import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Calendar, User, AlignLeft, Clock, Loader2, Sparkles, 
  LayoutGrid, CheckSquare, Settings, Bell, Search, MoreHorizontal,
  Bold, Italic, Heading1, Heading2, List, X, Trash2, ChevronRight
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

// --- STYLES ---
const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-blue-500', bg: 'bg-blue-50' },
  { id: 'doing', label: 'On Progress', color: 'bg-orange-500', bg: 'bg-orange-50' },
  { id: 'feedback', label: 'Feedback', color: 'bg-purple-500', bg: 'bg-purple-50' },
  { id: 'done', label: 'Done', color: 'bg-green-500', bg: 'bg-green-50' }
];

// --- FIXED RICH TEXT EDITOR ---
const RichTextEditor = ({ initialValue, onChange }) => {
  const editorRef = useRef(null);

  // 1. Handle Formatting
  const applyFormat = (command) => {
    document.execCommand(command, false, null);
    editorRef.current.focus();
  };

  // 2. Handle Typing (Update state without re-rendering DOM)
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // 3. Sync Data ONLY when it changes externally (like opening a new task)
  // This prevents the "Typing Backwards" bug by not forcing updates while you type.
  useEffect(() => {
    if (editorRef.current && initialValue !== editorRef.current.innerHTML) {
       // We only update the HTML if it's truly different from what's currently there.
       // This protects the cursor position.
       editorRef.current.innerHTML = initialValue || '';
    }
  }, [initialValue]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-white">
        <button type="button" onClick={() => applyFormat('bold')} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Bold size={16}/></button>
        <button type="button" onClick={() => applyFormat('italic')} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Italic size={16}/></button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button type="button" onClick={() => document.execCommand('formatBlock', false, 'h3')} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Heading1 size={16}/></button>
        <button type="button" onClick={() => applyFormat('insertUnorderedList')} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><List size={16}/></button>
      </div>
      
      {/* CRITICAL FIX: 
         Removed `dangerouslySetInnerHTML` prop. 
         We now manage content manually via the useEffect above.
      */}
      <div 
        ref={editorRef} 
        contentEditable 
        className="p-4 min-h-[150px] outline-none prose prose-sm max-w-none text-gray-700 cursor-text" 
        onInput={handleInput} 
      />
    </div>
  );
};

// --- COMPONENTS ---
const Sidebar = () => (
  <aside className="w-64 bg-[#1F2128] text-gray-400 flex flex-col h-screen fixed left-0 top-0 border-r border-gray-800 hidden md:flex">
    <div className="p-6 flex items-center gap-3 text-white mb-6">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-900/50">D</div>
      <span className="font-semibold text-xl tracking-tight">DoBoard</span>
    </div>
    <nav className="flex-1 px-4 space-y-2">
      <div className="px-4 py-3 bg-[#2C2D33] text-white rounded-xl flex items-center gap-3 cursor-pointer shadow-sm"><LayoutGrid size={20} className="text-blue-500" /><span className="font-medium">Board</span></div>
      <div className="px-4 py-3 hover:bg-[#2C2D33] hover:text-white rounded-xl flex items-center gap-3 cursor-pointer transition-colors"><CheckSquare size={20} /><span>My Tasks</span></div>
    </nav>
    <div className="p-6 border-t border-gray-800">
      <div className="bg-[#2C2D33] rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">U</div>
        <div><div className="text-white text-sm font-medium">User</div><div className="text-xs">Admin</div></div>
      </div>
    </div>
  </aside>
);

const EmptyState = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-700 p-12">
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500"><LayoutGrid size={32} /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Start your first project</h2>
      <p className="text-gray-500 max-w-xs mx-auto mb-6">Your board is clean. Create a task to visualize your workflow.</p>
      <button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-200">Create New Task</button>
    </div>
  </div>
);

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
    
    // Manual ID selection to be safe
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
    <div className="min-h-screen bg-[#F2F4F7] font-sans flex">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col h-screen">
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div><h1 className="text-2xl font-bold text-gray-900">Project Board</h1><p className="text-sm text-gray-500 mt-1">Manage your team's tasks and workflows</p></div>
          <div className="flex items-center gap-4">
             <button onClick={openNewTask} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"><Plus size={18} /> New Task</button>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-x-auto overflow-y-hidden">
          {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div> : tasks.length === 0 ? <EmptyState onCreate={openNewTask} /> : (
            <div className="flex gap-8 h-full min-w-[1000px]">
              {COLUMNS.map(col => (
                <div key={col.id} className="flex-1 flex flex-col min-w-[280px] h-full" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id)}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${col.color}`}></div><span className="font-bold text-gray-700">{col.label}</span><span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">{tasks.filter(t => t.status === col.id).length}</span></div>
                    <MoreHorizontal size={18} className="text-gray-400 cursor-pointer" />
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 pb-20">
                    {tasks.filter(t => t.status === col.id).map(task => (
                      <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => openEditTask(task)} className="bg-white p-5 rounded-2xl shadow-sm border border-transparent hover:border-blue-200 hover:shadow-md mb-4 cursor-pointer transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${col.id === 'done' ? 'bg-green-100 text-green-700' : col.id === 'doing' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{col.id === 'todo' ? 'Backlog' : col.id}</div>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-2 leading-snug">{task.title}</h3>
                        {task.brief && <p className="text-xs text-gray-400 line-clamp-2 mb-4">{task.brief.replace(/<[^>]*>?/gm, '')}</p>}
                        <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-2">
                           <div className="flex -space-x-2"><div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">JD</div></div>
                           <div className="flex items-center gap-3">{task.deadline && <div className={`flex items-center text-xs font-medium ${new Date(task.deadline) < new Date() && col.id !== 'done' ? 'text-red-500' : 'text-gray-400'}`}><Clock size={14} className="mr-1" />{new Date(task.deadline).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>}</div>
                        </div>
                      </div>
                    ))}
                    <button onClick={openNewTask} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"><Plus size={16}/> Add Task</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 text-sm text-gray-500"><span className="font-medium text-gray-900">{editingTask ? 'Edit Task' : 'Create New Task'}</span><ChevronRight size={14} /><span>{COLUMNS.find(c => c.id === (editingTask?.status || 'todo'))?.label}</span></div>
              <div className="flex items-center gap-2">
                {editingTask && <button onClick={() => handleDeleteTask(editingTask.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>}
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <input id="modal-title" type="text" placeholder="Task Title" defaultValue={editingTask?.title} className="w-full text-2xl font-bold text-gray-900 border-none focus:ring-0 p-0 mb-6 placeholder:text-gray-300 bg-transparent"/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client / Project</label><div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"><User size={16} className="text-gray-400" /><input id="modal-client" type="text" placeholder="e.g. Acme Corp" defaultValue={editingTask?.client} className="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-gray-700"/></div></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</label><div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"><Calendar size={16} className="text-gray-400" /><input id="modal-date" type="date" defaultValue={editingTask?.deadline} className="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-gray-700"/></div></div>
              </div>
              <div className="mb-2"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Description & Notes</label><RichTextEditor initialValue={editorContent} onChange={setEditorContent} /></div>
              <select id="modal-status" className="hidden" defaultValue={editingTask?.status || 'todo'}>{COLUMNS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}</select>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={handleSaveTask} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all">Save Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
