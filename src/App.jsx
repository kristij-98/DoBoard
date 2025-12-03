import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Calendar, User, AlignLeft, X, Clock, Loader2, Sparkles 
} from 'lucide-react';

// --- 1. CONFIGURATION ---
// We initialize Firebase inside this file so you don't need a separate firebase.js file.
// This prevents the "Could not resolve ./firebase" error.
const getFirebaseConfig = () => {
  // If running in the preview window
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }
  // If running on Railway (Production)
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
};

const app = initializeApp(getFirebaseConfig());
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. CONSTANTS ---
const COLLECTION_NAME = 'doboard_tasks';
const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-600' },
  { id: 'doing', label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  { id: 'feedback', label: 'Waiting for Feedback', color: 'bg-yellow-50 text-yellow-600' },
  { id: 'done', label: 'Done', color: 'bg-green-50 text-green-600' }
];

// --- 3. HELPER COMPONENTS ---
const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2";
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800 shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    danger: "text-red-500 hover:bg-red-50",
  };
  return <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

// --- 4. EMPTY STATE (Notion Style) ---
const EmptyState = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-700 p-8">
    <div className="w-64 h-64 mb-6 relative opacity-90">
       {/* Abstract Minimalist Illustration */}
       <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        <rect x="40" y="40" width="120" height="140" rx="2" fill="white" stroke="#E5E7EB" strokeWidth="2"/>
        <rect x="55" y="60" width="90" height="8" rx="1" fill="#F3F4F6"/>
        <rect x="55" y="80" width="60" height="6" rx="1" fill="#F3F4F6"/>
        <path d="M140 160L180 120" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="170" cy="50" r="15" fill="#FEF3C7" stroke="#FBBF24" strokeWidth="2"/>
        <path d="M165 130C165 130 170 110 190 115" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
        <rect x="20" y="80" width="30" height="30" rx="4" transform="rotate(-15 35 95)" fill="white" stroke="#E5E7EB" strokeWidth="2"/>
        <rect x="150" y="140" width="40" height="25" rx="4" transform="rotate(10 170 152.5)" fill="white" stroke="#E5E7EB" strokeWidth="2"/>
      </svg>
    </div>
    <h2 className="text-xl font-semibold text-gray-800 mb-2">You're all caught up!</h2>
    <p className="text-gray-500 max-w-sm text-center mb-8 leading-relaxed">
      Your board is currently empty. Create a task to start tracking your projects and deadlines.
    </p>
    <Button onClick={onCreate} className="pl-4 pr-5 py-2.5">
      <Sparkles size={16} /> Create First Task
    </Button>
  </div>
);

// --- 5. MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Authentication
  useEffect(() => {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
         import('firebase/auth').then(({ signInWithCustomToken }) => {
            signInWithCustomToken(auth, __initial_auth_token);
         });
    } else {
        signInAnonymously(auth).catch(console.error);
    }
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    
    // Determine the correct database path based on environment
    const collectionRef = typeof __app_id !== 'undefined' 
        ? collection(db, 'artifacts', __app_id, 'public', 'data', COLLECTION_NAME)
        : collection(db, COLLECTION_NAME);
    
    const q = query(collectionRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      taskList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(taskList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Save Task
  const handleSaveTask = async (taskData) => {
    if (!user) return;
    try {
      const collectionRef = typeof __app_id !== 'undefined' 
          ? collection(db, 'artifacts', __app_id, 'public', 'data', COLLECTION_NAME)
          : collection(db, COLLECTION_NAME);
      
      if (taskData.id) {
        const docPath = typeof __app_id !== 'undefined' 
            ? `artifacts/${__app_id}/public/data/${COLLECTION_NAME}/${taskData.id}`
            : `${COLLECTION_NAME}/${taskData.id}`;
            
        await updateDoc(doc(db, docPath), {
          title: taskData.title, 
          client: taskData.client, 
          deadline: taskData.deadline, 
          brief: taskData.brief, 
          status: taskData.status || 'todo'
        });
      } else {
        await addDoc(collectionRef, { ...taskData, status: 'todo', createdAt: serverTimestamp(), createdBy: user.uid });
      }
      setIsModalOpen(false);
    } catch (error) { console.error(error); }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try { 
        const docPath = typeof __app_id !== 'undefined' 
            ? `artifacts/${__app_id}/public/data/${COLLECTION_NAME}/${taskId}`
            : `${COLLECTION_NAME}/${taskId}`;
        await deleteDoc(doc(db, docPath)); 
        setIsModalOpen(false); 
    } catch (e) { console.error(e); }
  };

  // Update Status (Drag & Drop)
  const handleStatusChange = async (taskId, newStatus) => {
    try { 
        const docPath = typeof __app_id !== 'undefined' 
            ? `artifacts/${__app_id}/public/data/${COLLECTION_NAME}/${taskId}`
            : `${COLLECTION_NAME}/${taskId}`;
        await updateDoc(doc(db, docPath), { status: newStatus }); 
    } catch (e) { console.error(e); }
  };

  const onDragStart = (e, taskId) => { e.dataTransfer.setData("taskId", taskId); };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) handleStatusChange(taskId, targetStatus);
  };

  const openNewTask = () => { setEditingTask(null); setIsModalOpen(true); };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-lg">D</div>
          <h1 className="font-semibold text-lg tracking-tight">DoBoard</h1>
        </div>
        <Button onClick={openNewTask}><Plus size={16} /> New Task</Button>
      </nav>

      <main className="p-6 h-[calc(100vh-80px)] overflow-x-auto flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full flex-1">
            <Loader2 className="animate-spin text-gray-300" size={32} />
          </div>
        ) : tasks.length === 0 ? (
          // --- RENDER EMPTY STATE IF NO TASKS ---
          <div className="flex-1 flex items-center justify-center">
            <EmptyState onCreate={openNewTask} />
          </div>
        ) : (
          // --- RENDER BOARD IF TASKS EXIST ---
          <div className="flex gap-6 min-w-[1000px] h-full">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex-1 flex flex-col min-w-[280px]" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id)}>
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${col.color}`}>{col.label}</span>
                  <span className="text-gray-400 text-sm">{tasks.filter(t => t.status === col.id).length}</span>
                </div>
                <div className="flex-1 bg-gray-50/50 rounded-lg p-2 overflow-y-auto">
                  {tasks.filter(t => t.status === col.id).map(task => (
                    <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="bg-white p-3 rounded-md shadow-sm border border-gray-200/60 mb-3 cursor-grab hover:shadow-md transition-all">
                      <div className="font-medium text-gray-800 text-sm mb-2">{task.title}</div>
                      <div className="space-y-2">
                        {task.client && <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-100"><User size={10} className="mr-1" />{task.client}</div>}
                        <div className="flex items-center justify-between">
                          {task.deadline && <div className="flex items-center text-xs text-gray-500"><Clock size={12} className="mr-1" />{task.deadline}</div>}
                          {task.brief && <AlignLeft size={12} className="text-gray-400" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === col.id).length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-sm">Drop here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
            <input type="text" placeholder="Task Title" className="w-full text-3xl font-bold border-none focus:ring-0 p-0" defaultValue={editingTask?.title} id="title-input" />
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <input type="text" placeholder="Client" className="w-full bg-transparent border-b border-gray-200" defaultValue={editingTask?.client} id="client-input" />
              <input type="date" className="w-full bg-transparent border-b border-gray-200" defaultValue={editingTask?.deadline} id="date-input" />
              <select className="w-full bg-transparent border-b border-gray-200" defaultValue={editingTask?.status || 'todo'} id="status-input">
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <textarea placeholder="Brief..." className="w-full min-h-[150px] border-none focus:ring-0 resize-none" defaultValue={editingTask?.brief} id="brief-input"></textarea>
            <div className="flex justify-end gap-3">
              {editingTask && <Button variant="danger" onClick={() => handleDeleteTask(editingTask.id)}>Delete</Button>}
              <Button onClick={() => handleSaveTask({
                id: editingTask?.id,
                title: document.getElementById('title-input').value,
                client: document.getElementById('client-input').value,
                deadline: document.getElementById('date-input').value,
                status: document.getElementById('status-input').value,
                brief: document.getElementById('brief-input').value
              })}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
