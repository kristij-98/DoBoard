import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Plus, Calendar, User, AlignLeft, Clock, Loader2, Sparkles, UserCircle2, AlertCircle } from 'lucide-react';

// --- 1. CONFIGURATION (HARDCODED) ---
// These are your specific keys. They are hardcoded so they cannot be missing.
const firebaseConfig = {
  apiKey: "AIzaSyC2P7U9SdXQTEjdku4A6dKA3OaOqXxwo_4",
  authDomain: "doboard-449ba.firebaseapp.com",
  projectId: "doboard-449ba",
  storageBucket: "doboard-449ba.firebasestorage.app",
  messagingSenderId: "237145709336",
  appId: "1:237145709336:web:469136848f63b71bcd9c6d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION_NAME = 'doboard_tasks';
const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-600' },
  { id: 'doing', label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  { id: 'feedback', label: 'Feedback', color: 'bg-yellow-50 text-yellow-600' },
  { id: 'done', label: 'Done', color: 'bg-green-50 text-green-600' }
];

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2";
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800 shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    danger: "text-red-500 hover:bg-red-50",
  };
  return <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const EmptyState = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-700 p-8">
    <div className="w-64 h-64 mb-6 relative opacity-90 grayscale-[20%]">
       <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm"><rect x="50" y="40" width="100" height="130" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="2"/><rect x="65" y="60" width="70" height="6" rx="1" fill="#F3F4F6"/><rect x="65" y="75" width="40" height="6" rx="1" fill="#F3F4F6"/><rect x="65" y="90" width="70" height="6" rx="1" fill="#F3F4F6"/><circle cx="160" cy="50" r="12" fill="#FEF3C7" stroke="#FBBF24" strokeWidth="2"/><path d="M140 140L170 110" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/><path d="M160 120C160 120 165 100 185 105" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/><rect x="30" y="90" width="40" height="30" rx="3" transform="rotate(-15 40 100)" fill="white" stroke="#E5E7EB" strokeWidth="2"/><circle cx="40" cy="100" r="3" fill="#E5E7EB"/></svg>
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">It's quiet here...</h2>
    <p className="text-gray-500 max-w-sm text-center mb-8 leading-relaxed">Your board is currently empty. Create a new task to get started.</p>
    <Button onClick={onCreate} className="pl-4 pr-5 py-2.5 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"><Sparkles size={16} /> Create First Task</Button>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Attempt sign in immediately
    signInAnonymously(auth).catch((error) => setErrorMsg("Auth Error: " + error.message));
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
    }, (error) => { setErrorMsg("Database Error: " + error.message); setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  const handleSaveTask = async (taskData) => {
    if (!user) return;
    try {
      const collectionRef = collection(db, COLLECTION_NAME);
      if (taskData.id) {
        await updateDoc(doc(db, COLLECTION_NAME, taskData.id), { title: taskData.title, client: taskData.client, deadline: taskData.deadline, brief: taskData.brief, status: taskData.status || 'todo' });
      } else {
        await addDoc(collectionRef, { ...taskData, status: 'todo', createdAt: serverTimestamp(), createdBy: user.uid });
      }
      setIsModalOpen(false);
    } catch (error) { alert("Error saving: " + error.message); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try { await deleteDoc(doc(db, COLLECTION_NAME, taskId)); setIsModalOpen(false); } catch (e) { alert("Error deleting: " + e.message); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try { await updateDoc(doc(db, COLLECTION_NAME, taskId), { status: newStatus }); } catch (e) { console.error(e); }
  };

  const onDragStart = (e, taskId) => { e.dataTransfer.setData("taskId", taskId); };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) handleStatusChange(taskId, targetStatus);
  };

  const openNewTask = () => { setEditingTask(null); setIsModalOpen(true); };

  if (errorMsg) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6 text-center">
            <AlertCircle className="text-red-500 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-red-900 mb-2">Something went wrong</h1>
            <div className="bg-white p-4 rounded border border-red-200 shadow-sm max-w-lg overflow-auto"><code className="text-red-600 font-mono text-sm">{errorMsg}</code></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 flex flex-col">
      {/* VISUAL INDICATOR: I changed the header to green. 
         If this bar is NOT green on your website, the new code hasn't loaded yet.
      */}
      <nav className="sticky top-0 z-30 bg-green-50 backdrop-blur-md border-b border-green-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-lg">D</div><h1 className="font-semibold text-lg tracking-tight">DoBoard Fixed</h1></div>
        <Button onClick={openNewTask}><Plus size={16} /> New Task</Button>
      </nav>
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        {loading ? <div className="flex-1 flex items-center justify-center flex-col gap-4"><Loader2 className="animate-spin text-gray-300" size={32} /></div> : tasks.length === 0 ? <div className="flex-1 flex items-center justify-center"><EmptyState onCreate={openNewTask} /></div> : (
          <div className="flex gap-6 h-full overflow-x-auto pb-4">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex-1 flex flex-col min-w-[280px]" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id)}>
                <div className="flex items-center justify-between mb-4 px-1"><span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${col.color}`}>{col.label}</span><span className="text-gray-400 text-sm">{tasks.filter(t => t.status === col.id).length}</span></div>
                <div className="flex-1 bg-gray-50/50 rounded-lg p-2 overflow-y-auto">
                  {tasks.filter(t => t.status === col.id).map(task => (
                    <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="bg-white p-3 rounded-md shadow-sm border border-gray-200/60 mb-3 cursor-grab hover:shadow-md transition-all">
                      <div className="font-medium text-gray-800 text-sm mb-2">{task.title}</div>
                      <div className="space-y-2">
                        {task.client && <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-100"><UserCircle2 size={12} className="mr-1" />{task.client}</div>}
                        <div className="flex items-center justify-between">{task.deadline && <div className="flex items-center text-xs text-gray-500"><Clock size={12} className="mr-1" />{task.deadline}</div>}{task.brief && <AlignLeft size={12} className="text-gray-400" />}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
            <input type="text" placeholder="Task Title" className="w-full text-3xl font-bold border-none focus:ring-0 p-0 placeholder:text-gray-300" defaultValue={editingTask?.title} id="title-input" autoFocus />
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg"><input type="text" placeholder="Client" className="w-full bg-transparent border-b border-gray-200" defaultValue={editingTask?.client} id="client-input" /><input type="date" className="w-full bg-transparent border-b border-gray-200" defaultValue={editingTask?.deadline} id="date-input" /><select className="w-full bg-transparent border-b border-gray-200" defaultValue={editingTask?.status || 'todo'} id="status-input">{COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
            <textarea placeholder="Brief..." className="w-full min-h-[150px] border-none focus:ring-0 resize-none placeholder:text-gray-300" defaultValue={editingTask?.brief} id="brief-input"></textarea>
            <div className="flex justify-end gap-3">{editingTask && <Button variant="danger" onClick={() => handleDeleteTask(editingTask.id)}>Delete</Button>}<Button onClick={() => handleSaveTask({ id: editingTask?.id, title: document.getElementById('title-input').value, client: document.getElementById('client-input').value, deadline: document.getElementById('date-input').value, status: document.getElementById('status-input').value, brief: document.getElementById('brief-input').value })}>Save</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
