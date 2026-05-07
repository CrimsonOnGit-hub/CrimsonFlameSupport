import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, doc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBSSJKDrFJ1_qlliZqgw34CY2TSaKOxxxM",
    authDomain: "crimsonflame-8169e.firebaseapp.com",
    projectId: "crimsonflame-8169e",
    storageBucket: "crimsonflame-8169e.firebasestorage.app",
    messagingSenderId: "406321213530",
    appId: "1:406321213530:web:92d27a69d34d147393a863"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_EMAIL = "allaboutwaterdiamond@gmail.com";

let currentUser = null;
let isGlobalAdmin = false;
let activeTicketId = null; 
let ticketChatUnsubscribe = null;

window.showCustomPrompt = function(title, desc, placeholder, onConfirm) {
    const overlay = document.getElementById('custom-prompt');
    const input = document.getElementById('custom-prompt-input');
    document.getElementById('custom-prompt-title').innerText = title; 
    document.getElementById('custom-prompt-desc').innerText = desc;
    input.value = ""; input.placeholder = placeholder;
    overlay.classList.add('active'); input.focus();
    
    document.getElementById('custom-prompt-confirm').onclick = () => {
        if(input.value.trim() !== "") { overlay.classList.remove('active'); onConfirm(input.value.trim()); }
    };
};

window.showCustomAlert = function(message) {
    const overlay = document.getElementById('custom-alert');
    document.getElementById('custom-alert-message').innerText = message; 
    overlay.classList.add('active');
};

onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        isGlobalAdmin = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
        document.getElementById('support-locked').style.display = 'none';
        document.getElementById('support-system').style.display = 'block';
        document.getElementById('thread-view').style.display = 'none';
        fetchTickets();
    } else {
        currentUser = null; isGlobalAdmin = false;
        document.getElementById('support-locked').style.display = 'flex';
        document.getElementById('support-system').style.display = 'none';
    }
});

window.fetchTickets = async function() {
    if(!currentUser) return;
    const list = document.getElementById('ticket-list');
    let q = query(collection(db, "tickets"), orderBy("timestamp", "desc"));
    if(!isGlobalAdmin) q = query(collection(db, "tickets"), where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
    try {
        const snap = await getDocs(q); list.innerHTML = "";
        if(snap.empty) { list.innerHTML = "<p>No tickets.</p>"; return; }
        snap.forEach(d => {
            const el = document.createElement('div'); el.className = "card-container"; 
            el.style.cursor = "pointer"; el.style.padding = "15px"; el.style.marginBottom = "10px";
            el.innerHTML = `<strong style="font-size:1.1rem;">${d.data().subject}</strong> <span style="float:right; color:${d.data().status === 'Closed' ? '#f87171' : '#4ade80'};">${d.data().status}</span>`;
            el.onclick = () => window.openThread(d.id, d.data()); list.appendChild(el);
        });
    } catch(err) { list.innerHTML = `<p>Error loading tickets.</p>`; }
};

window.submitTicket = async function(e) {
    e.preventDefault(); 
    if(!currentUser) return;
    await addDoc(collection(db, "tickets"), { userId: currentUser.uid, userEmail: currentUser.email, subject: document.getElementById('ticket-subject').value, message: document.getElementById('ticket-msg').value, status: "Open", timestamp: serverTimestamp() });
    window.showCustomAlert("Ticket submitted."); fetchTickets(); document.getElementById('ticket-form').reset();
};

window.openThread = function(id, data) {
    activeTicketId = id; 
    document.getElementById('list-view').style.display = 'none'; 
    document.getElementById('thread-view').style.display = 'flex';
    document.getElementById('active-subject').innerText = data.subject;
    document.getElementById('ticket-chat-form').style.display = data.status === "Closed" ? 'none' : 'flex';
    document.getElementById('admin-close-area').style.display = (isGlobalAdmin && data.status !== "Closed") ? 'block' : 'none';
    
    if(ticketChatUnsubscribe) ticketChatUnsubscribe();
    ticketChatUnsubscribe = onSnapshot(query(collection(db, "tickets", id, "messages"), orderBy("timestamp", "asc")), snap => {
        const box = document.getElementById('ticket-chat-box'); box.innerHTML = "";
        snap.forEach(m => { box.innerHTML += `<div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);"><strong style="color:var(--crimson);">${m.data().senderName}</strong>: <span style="color:#dbdee1;">${m.data().text}</span></div>`; });
        box.scrollTop = box.scrollHeight;
    });
};

window.closeThreadView = () => { 
    document.getElementById('list-view').style.display = 'block'; 
    document.getElementById('thread-view').style.display = 'none'; 
};

window.closeActiveTicket = () => { 
    window.showCustomPrompt("Close Ticket", "Reason for closing:", "Reason...", async (r) => { 
        await updateDoc(doc(db, "tickets", activeTicketId), { status: "Closed", closeReason: r }); 
        window.closeThreadView(); 
        fetchTickets();
    }); 
};

window.submitTicketChat = async function(e) { 
    e.preventDefault(); 
    const inp = document.getElementById('ticket-chat-input'); 
    await addDoc(collection(db, "tickets", activeTicketId, "messages"), { text: inp.value, sender: currentUser.email, senderName: currentUser.displayName, timestamp: serverTimestamp() }); 
    inp.value = ""; 
};
