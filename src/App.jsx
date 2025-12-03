import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Plus, Calendar, User, AlignLeft, X, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { db, auth } from './firebase';

// Updated Collection Name
const COLLECTION_NAME = 'doboard_tasks';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-600' },
  { id: 'doing', label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  { id: 'feedback', label: 'Waiting for Feedback', color: 'bg-yellow-50 text-yellow-600' },
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

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
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
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveTask = async (taskData) => {
    if (!user) return;
    try {
      const collectionRef = collection(db, COLLECTION_NAME);
      if (taskData.id) {
        await updateDoc(doc(db, COLLECTION_NAME, taskData.id), {
          title: taskData.title, client: taskData.client, deadline: taskData.deadline, brief: taskData.brief, status: taskData.status || 'todo'
        });
      } else {
        await addDoc(collectionRef, { ...taskData, status: 'todo', createdAt: serverTimestamp(), createdBy: user.uid });
      }
      setIsModalOpen(false);
    } catch (error) { console.error(error); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try { await deleteDoc(doc(db, COLLECTION_NAME, taskId)); setIsModalOpen(false); } catch (e) { console.error(e); }
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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo updated to 'D' */}
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-lg">D</div>
          {/* Title updated to DoBoard */}
          <h1 className="font-semibold text-lg tracking-tight">DoBoard</h1>
        </div>
        <Button onClick={() => { setEditingTask(null); setIsModalOpen(true); }}><Plus size={16} /> New Task</Button>
      </nav>

      <main className="p-6 h-[calc(100vh-80px)] overflow-x-auto">
        {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-300" size={32} /></div> : (
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
