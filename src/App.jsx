import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Plus, Calendar, User, AlignLeft, Clock, Loader2, MoreHorizontal, X, CheckSquare, GripVertical } from 'lucide-react';

// --- YOUR CONFIGURATION (Verified) ---
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

// Notion-style pastel colors
const COLUMNS = [
  { id: 'todo', label: 'To Do', bg: 'bg-[#F7F7F5]', text: 'text-[#37352F]', badge: 'bg-[#E3E2E0] text-[#32302C]' },
  { id: 'doing', label: 'In Progress', bg: 'bg-[#F7F7F5]', text: 'text-[#37352F]', badge: 'bg-[#D3E5EF] text-[#183347]' },
  { id: 'feedback', label: 'Feedback', bg: 'bg-[#F7F7F5]', text: 'text-[#37352F]', badge: 'bg-[#FDECC8] text-[#402C1B]' },
  { id: 'done', label: 'Done', bg: 'bg-[#F7F7F5]', text: 'text-[#37352F]', badge: 'bg-[#DBEDDB] text-[#1C3829]' }
];

// --- COMPONENTS ---

const NotionButton = ({ children, onClick, variant = 'primary', className = '' }) => {
  const baseStyle = "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 select-none";
  const variants = {
    primary: "bg-[#2383E2] text-white hover:bg-[#1B6BB8] shadow-sm",
    ghost: "bg-transparent text-[#6B6B6B] hover:bg-[#EFEFEE] hover:text-[#37352F]",
    danger: "text-[#EB5757] hover:bg-[#FFEEEE]",
    secondary: "border border-[#E0E0E0] text-[#37352F] hover:bg-[#F7F7F5]"
  };
  return <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

const EmptyState = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-700">
    <div className="w-48 h-48 mb-6 opacity-80">
      {/* Notion Style Line Illustration */}
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M40 60C40 54.4772 44.4772 50 50 50H150C155.523 50 160 54.4772 160 60V160C160 165.523 155.523 170 150 170H50C44.4772 170 40 165.523 40 160V60Z" fill="white" stroke="#E0E0E0" strokeWidth="2"/>
        <rect x="60" y="80" width="80" height="8" rx="2" fill="#F0F0F0"/>
        <rect x="60" y="100" width="50" height="8" rx="2" fill="#F0F0F0"/>
        <rect x="60" y="120" width="70" height="8" rx="2" fill="#F0F0F0"/>
        <circle cx="140" cy="70" r="15" fill="#FFF8E0" stroke="#FFE082" strokeWidth="2"/>
        {/* Floating elements */}
        <rect x="30" y="110" width="40" height="30" rx="4" transform="rotate(-12 30 110)" fill="white" stroke="#E0E0E0" strokeWidth="2"/>
        <path d="M130 150L170 110" stroke="#CCCCCC" strokeWidth="2" strokeDasharray="4 4"/>
      </svg>
    </div>
    <h2 className="text-lg font-medium text-[#37352F] mb-1">No tasks yet</h2>
    <p className="text-[#9B9A97] text-sm mb-6">Click below to add your first project.</p>
    <NotionButton onClick={onCreate} variant="primary">Create new task</NotionButton>
  </div>
);

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch((e) => console.error(e));
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

  const handleSaveTask = async (taskData) => {
    if (!user) return;
    const collectionRef = collection(db, COLLECTION_NAME);
    if (taskData.id) {
      await updateDoc(doc(db, COLLECTION_NAME, taskData.id), { ...taskData });
    } else {
      await addDoc(collectionRef, { ...taskData, status: 'todo', createdAt: serverTimestamp(), createdBy: user.uid });
    }
    setIsModalOpen(false);
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

  const openNewTask = () => { setEditingTask(null); setIsModalOpen(true); };

  return (
    <div className="min-h-screen bg-white text-[#37352F] font-sans flex flex-col">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-30 bg-white border-b border-[#E0E0E0] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#37352F] rounded-sm flex items-center justify-center text-white font-bold text-xs">D</div>
          <h1 className="font-medium text-sm tracking-wide">DoBoard</h1>
          <span className="text-[#9B9A97] text-xs px-2 border-l border-[#E0E0E0] ml-2">Team Workspace</span>
        </div>
        <NotionButton onClick={openNewTask} variant="primary">New</NotionButton>
      </nav>

      {/* BOARD AREA */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#9B9A97]" /></div>
        ) : tasks.length === 0 ? (
          <EmptyState onCreate={openNewTask} />
        ) : (
          <div className="flex gap-4 h-full overflow-x-auto pb-4 items-start">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex-none w-[260px] flex flex-col max-h-full" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id)}>
                {/* Column Header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${col.badge}`}>{col.label}</span>
                    <span className="text-[#9B9A97] text-xs">{tasks.filter(t => t.status === col.id).length}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={openNewTask} className="text-[#9B9A97] hover:bg-[#EFEFEE] p-1 rounded"><Plus size={14}/></button>
                  </div>
                </div>
                
                {/* Column Content */}
                <div className="flex-1 overflow-y-auto pb-10">
                  {tasks.filter(t => t.status === col.id).map(task => (
                    <div 
                      key={task.id} 
                      draggable 
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                      className="group bg-white p-3 rounded shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#E0E0E0] hover:bg-[#FBFAF9] mb-2 cursor-pointer transition-all relative"
                    >
                      <div className="text-[#37352F] font-medium text-sm mb-2 pr-4">{task.title || "Untitled"}</div>
                      
                      <div className="space-y-1.5">
                        {task.client && (
                          <div className="flex items-center text-xs text-[#5f5e5b]">
                            <User size={12} className="mr-1.5 text-[#9B9A97]"/> 
                            <span className="bg-[#F7F7F5] px-1 rounded truncate max-w-[150px]">{task.client}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className="flex items-center text-xs text-[#5f5e5b]">
                            <Calendar size={12} className="mr-1.5 text-[#9B9A97]"/>
                            <span>{task.deadline}</span>
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-[#D3D3D3]">
                        <GripVertical size={12}/>
                      </div>
                    </div>
                  ))}
                  <div className="h-8 rounded hover:bg-[#F7F7F5] flex items-center justify-center text-[#9B9A97] text-xs cursor-pointer transition-colors" onClick={openNewTask}>+ New</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* NOTION STYLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#191919]/40 backdrop-blur-[2px]" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.98] duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0] text-sm text-[#9B9A97]">
              <div className="flex items-center gap-2">
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#2383E2]"></div> {editingTask?.status ? COLUMNS.find(c => c.id === editingTask.status)?.label : 'To Do'}</span>
              </div>
              <div className="flex items-center gap-1">
                {editingTask && <button onClick={() => handleDeleteTask(editingTask.id)} className="p-1.5 hover:bg-[#FFEEEE] text-[#9B9A97] hover:text-red-500 rounded"><span className="sr-only">Delete</span>Delete</button>}
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-[#EFEFEE] rounded"><X size={18}/></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-12">
              <input 
                id="modal-title"
                type="text" 
                placeholder="Untitled" 
                defaultValue={editingTask?.title} 
                className="w-full text-4xl font-bold text-[#37352F] placeholder-[#D3D3D3] border-none focus:ring-0 p-0 mb-8"
              />

              {/* Properties Grid */}
              <div className="space-y-4 mb-8 text-sm">
                <div className="grid grid-cols-[140px_1fr] items-center">
                  <div className="text-[#9B9A97] flex items-center gap-2"><User size={14}/> Client</div>
                  <input id="modal-client" type="text" defaultValue={editingTask?.client} placeholder="Empty" className="w-full bg-transparent border-none focus:ring-0 p-1 hover:bg-[#F7F7F5] rounded text-[#37352F]"/>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center">
                  <div className="text-[#9B9A97] flex items-center gap-2"><Calendar size={14}/> Due Date</div>
                  <input id="modal-date" type="date" defaultValue={editingTask?.deadline} className="bg-transparent border-none focus:ring-0 p-1 hover:bg-[#F7F7F5] rounded text-[#37352F]"/>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center">
                  <div className="text-[#9B9A97] flex items-center gap-2"><CheckSquare size={14}/> Status</div>
                  <select id="modal-status" defaultValue={editingTask?.status || 'todo'} className="bg-transparent border-none focus:ring-0 p-1 hover:bg-[#F7F7F5] rounded text-[#37352F] cursor-pointer">
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-[#F0F0F0] pt-6">
                <div className="text-[#37352F] font-semibold mb-2 flex items-center gap-2"><AlignLeft size={16}/> Brief / Notes</div>
                <textarea 
                  id="modal-brief"
                  defaultValue={editingTask?.brief} 
                  placeholder="Type your notes here... (Markdown supported)" 
                  className="w-full min-h-[300px] border-none focus:ring-0 text-[#37352F] leading-relaxed resize-none p-0"
                ></textarea>
              </div>
            </div>

            {/* Modal Footer (Action) */}
            <div className="p-4 border-t border-[#F0F0F0] bg-[#FBFAF9] flex justify-end">
              <NotionButton 
                variant="primary" 
                onClick={() => handleSaveTask({
                  id: editingTask?.id,
                  title: document.getElementById('modal-title').value,
                  client: document.getElementById('modal-client').value,
                  deadline: document.getElementById('modal-date').value,
                  status: document.getElementById('modal-status').value,
                  brief: document.getElementById('modal-brief').value,
                })}
              >
                Done
              </NotionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
