
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://voslmijkamswlmmcugjd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2xtaWprYW1zd2xtbWN1Z2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTQ2NTcsImV4cCI6MjA4ODUzMDY1N30.FcILRfxoCt537qWKMhN9vATxnBLZfLdPrwk0OVbUcaE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

window.signUpUser = async function signUpUser() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const course = document.getElementById('signup-course').value;
    const semester = document.getElementById('signup-semester').value;

    if (!email || !password || course === "") return alert("Fill all fields!");

    // 1. Create Auth User
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert("Sign up failed: " + error.message);

    // 2. Create Profile Entry (CRITICAL FOR CONNECTIVITY)
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: data.user.id, email, course, semester }]);

    if (profileError) {
        console.error("Profile error:", profileError);
    } else {
        alert("Success! Profile synced to cloud. You can now login.");
        toggleAuth();
    }
}

// LOGIN FUNCTION
window.loginUser = async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) return alert("Please enter email and password");

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) return alert("Login failed: " + error.message);

    if (data.user) {
        currentUser = data.user;

        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('course, semester')
            .eq('id', currentUser.id)
            .single();

        if (profile) {
            window.userCourse = profile.course;
            window.userSemester = profile.semester;
        } else {
            // Fallback if profile table is empty for this user
            window.userCourse = "Student";
            window.userSemester = "New";
        }

        fetchPlaylistsFromCloud();
        showDashboard();
    }
}

// Global array to store topics - pulls from memory if it exists
let topics = JSON.parse(localStorage.getItem('studyTopics')) || [];


window.showDashboard = async function () {
    // 1. Ensure we have a logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // 2. Fetch the LATEST profile data from your Supabase 'profiles' table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('course, semester')
            .eq('id', user.id)
            .single();

        if (profile) {
            // 3. Update the Global Variables
            window.userCourse = profile.course;
            window.userSemester = profile.semester;

            // 4. Update the UI Text
            document.getElementById('user-display-name').innerText = user.email.split('@')[0];
            document.getElementById('user-display-meta').innerText = `${profile.course} - Semester ${profile.semester}`;
        }
    }

    // 5. Switch screens (your existing logic)
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('landing-page-wrapper').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');

    // 6. Load user-specific tasks
    renderTasks();
}

// 3. PLANNER LOGIC
window.calculatePlan = function calculatePlan() {
    const total = document.getElementById('total-topics-input').value;
    const months = document.getElementById('months-left').value;

    if (!total || !months) {
        alert("Please fill in both fields!");
        return;
    }

    // New Formula: Divide total topics by weeks (months * 4)
    const perWeek = (total / (months * 4)).toFixed(1);

    document.getElementById('plan-result').innerText =
        `To finish in ${months} months, you need to complete ${perWeek} topics per week!`;
}


window.downloadPlanner = function downloadPlanner() {
    const element = document.getElementById('roadmap-container');
    const subject = document.getElementById('subject-select').value;

    if (!element.innerHTML || element.innerHTML.includes("Fetching")) {
        return alert("Generate a plan first!");
    }

    const options = {
        margin: [10, 10],
        filename: `${subject}_Study_Plan.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#020617' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(options).from(element).save();
}


// 4. TOPIC TRACKER LOGIC
window.toggleTaskForm = function toggleTaskForm() {
    const topicName = prompt("Enter topic name from your syllabus:");
    if (topicName && topicName.trim() !== "") {
        const topic = { name: topicName, completed: false };
        topics.push(topic);
        saveAndRender();
    }
}

window.toggleTopic = function toggleTopic(index) {
    topics[index].completed = !topics[index].completed;
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('studyTopics', JSON.stringify(topics));
    renderTopics();
}

function renderTopics() {
    const list = document.getElementById('topic-list');
    if (!list) return;

    list.innerHTML = '';
    let completedCount = 0;

    topics.forEach((topic, index) => {
        if (topic.completed) completedCount++;

        list.innerHTML += `
            <li style="margin-bottom: 10px; font-size: 18px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <input type="checkbox" ${topic.completed ? 'checked' : ''} onchange="toggleTopic(${index})">
                <span style="${topic.completed ? 'text-decoration: line-through; color: gray;' : ''}">${topic.name}</span>
            </li>
        `;
    });

    // Update Stats Safely
    const completedEl = document.getElementById('stat-completed');
    const rateEl = document.getElementById('stat-rate');
    const totalEl = document.getElementById('stat-total');

    if (completedEl) completedEl.innerText = completedCount;

    const savedTotal = localStorage.getItem('totalTopicsCount') || topics.length;
    if (totalEl) totalEl.innerText = savedTotal;

    if (rateEl) {
        const rate = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;
        rateEl.innerText = rate + "%";
    }
}

// Load saved data when the page opens without crashing the login
window.onload = function () {
    console.log("App initialized.");
    const savedTotal = localStorage.getItem('totalTopicsCount');
    const totalEl = document.getElementById('stat-total');
    if (savedTotal && totalEl) {
        totalEl.innerText = savedTotal;
    }
}
window.showSection = function (sectionId) {
    // 1. Get all elements with the class 'tab-content'
    const sections = document.querySelectorAll('.tab-content');

    // 2. Hide every single one of them
    sections.forEach(sec => {
        sec.classList.add('hidden');
    });

    // 3. Show the ONE section the user requested
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.error("Could not find section:", sectionId);
    }

    // 4. (Optional) Manage Sidebar Active State
    const tabs = document.querySelectorAll('.sidebar li');
    tabs.forEach(tab => tab.classList.remove('active'));

}

//save function for Notes
function saveNotes() {
    const noteData = document.getElementById('quick-notes').value;
    localStorage.setItem('savedNotes', noteData);
    alert("Notes saved to browser memory! ✅");
}
// Array to store notes references
let savedNotes = JSON.parse(localStorage.getItem('studyNotesVault')) || [];

window.addNoteLink = async function addNoteLink() {
    console.log("Button clicked!");
    const subject = document.getElementById('note-subject').value;
    const fileInput = document.getElementById('note-file');
    const isPublic = document.getElementById('is-public-check')?.checked || false;

    if (!subject || fileInput.files.length === 0) return alert("Select a file first!");

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 1. Upload to the bucket you just created
    let { error: uploadError } = await supabase.storage
        .from('notes_files') // THIS MUST MATCH THE BUCKET NAME
        .upload(filePath, file);

    if (uploadError) return alert("Upload failed: " + uploadError.message);

    // 2. Insert into the table (Make sure this name matches your DB exactly)
    const { error } = await supabase
        .from('notes_vault')
        .insert([{
            subject: subject,
            file_name: file.name,
            file_url: filePath,
            user_id: currentUser.id,
            is_public: isPublic
        }]);

    if (error) {
        alert("DB Error: " + error.message);
    } else {
        alert("Note saved to Vault! ✨");
        fetchNotesFromCloud();
    }
}

function renderNotes() {
    const list = document.getElementById('notes-list');
    const emptyMsg = document.getElementById('no-notes');
    if (!list) return;

    list.innerHTML = '';

    if (savedNotes.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
    } else {
        if (emptyMsg) emptyMsg.style.display = 'none';

        savedNotes.forEach((note, index) => {
            list.innerHTML += `
                <li style="background: #f8f9ff; padding: 15px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid #6a5af9;">
                    <div>
                        <strong style="color: #333;">${note.subject}</strong><br>
                        <span style="font-size: 0.85rem; color: #666;">📄 ${note.fileName}</span>
                    </div>
                    <button onclick="deleteNote(${index})" style="background: none; border: none; color: #ff7eb3; cursor: pointer; font-size: 1.2rem;">🗑️</button>
                </li>
            `;
        });
    }
}

window.deleteNote = function deleteNote(index) {
    if (confirm("Delete this note from your vault?")) {
        savedNotes.splice(index, 1);
        localStorage.setItem('studyNotesVault', JSON.stringify(savedNotes));
        renderNotes();
    }
}

const originalShowSection = showSection;
showSection = function (sectionId) {
    originalShowSection(sectionId);
    if (sectionId === 'notes-section') {
        renderNotes();
    }
}
//let savedPlaylists = JSON.parse(localStorage.getItem('studyPlaylists')) || [];

function getYoutubeID(url) {
    // This looks for 'v=' (video) or 'list=' (playlist)
    const vidMatch = url.match(/[?&]v=([^&#]+)/);
    const listMatch = url.match(/[?&]list=([^&#]+)/);

    if (vidMatch) return vidMatch[1];
    if (listMatch) return listMatch[1]; // Returns the playlist ID
    return null;
}

window.addPlaylist = async function () {
    const title = document.getElementById('playlist-title').value;
    const url = document.getElementById('playlist-url').value;
    const videoId = getYoutubeID(url);

    if (!videoId) return alert("Please enter a valid YouTube link!");

    // Instead of localStorage, we send to Supabase 'lectures' table
    const { data, error } = await supabase
        .from('lectures')
        .insert([
            {
                title: title,
                url: url,
                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                user_id: currentUser.id, // Private by default
                is_public: true // For now, let's keep it public to test the feed
            }
        ]);

    if (error) console.error(error);
    else renderLectures();
}

function renderPlaylists() {
    const container = document.getElementById('playlist-container');
    if (!container) return;

    container.innerHTML = '';

    savedPlaylists.forEach((item, index) => {
        container.innerHTML += `
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="display: block; color: #333;">${item.title}</strong>
                    <a href="${item.url}" target="_blank" style="color: #6a5af9; text-decoration: none; font-size: 0.85rem;">Click to watch on YouTube ↗</a>
                </div>
                <button onclick="deletePlaylist(${index})" style="background: none; border: none; color: #ff7eb3; cursor: pointer; font-size: 1.1rem;">🗑️</button>
            </div>
        `;
    });
}

window.addEventListener('load', renderPlaylists);


function renderSimpleList(data, subject) {
    let html = `<h3>${subject} Syllabus</h3><ul style="text-align: left; color: white;">`;
    data.forEach(topic => {
        html += `<li>${topic.topic_name}</li>`;
    });
    html += `</ul>`;
    document.getElementById('roadmap-container').innerHTML = html;
}

function renderSmartPlanner(data, subject, months) {
    // Math: Total topics divided by (months * 4 weeks)
    const topicsPerWeek = Math.ceil(data.length / (months * 4));

    let html = `<h3>${months}-Month Plan for ${subject}</h3>`;
    html += `<p style="color: #6366f1;">Target: ${topicsPerWeek} topics per week</p><br>`;

    // Your existing week-grouping logic goes here...
    document.getElementById('roadmap-container').innerHTML = html + "(Plan items rendered here)";
}

// Function to move a topic from the roadmap to your "Daily Dashboard"
function addToMainTracker(topicName) {
    if (!topics.some(t => t.name === topicName)) {
        topics.push({ name: topicName, completed: false });
        saveAndRender();
        alert(`${topicName} added to your Dashboard!`);
    } else {
        alert("Topic already in tracker!");
    }
}

window.toggleAuth = function () {
    const login = document.getElementById('login-screen');
    const setup = document.getElementById('setup-screen');

    if (login && setup) {
        login.classList.toggle('hidden');
        setup.classList.toggle('hidden');
    } else {
        console.error("Could not find login-screen or setup-screen IDs in HTML");
    }
}

async function fetchNotesFromCloud() {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        // Filter: (user_id is mine) OR (is_public is true)
        .or(`user_id.eq.${currentUser.id},is_public.eq.true`);

    if (data) {
        savedNotes = data;
        renderNotes();
    }
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;  //check if user is logged in and set the global variable
        fetchPlaylistsFromCloud();
    }
});

async function fetchPlaylistsFromCloud() {
    if (!currentUser) return;

    const { data, error } = await supabase
        .from('playlists')
        .select('*');

    if (error) {
        console.error("Error fetching playlists:", error);
    } else {
        savedPlaylists = data; // Syncs the cloud data to your local array
        renderPlaylists();      // Updates the UI
    }
}


window.handleSyllabusAction = async function (mode) {
    const subject = document.getElementById('subject-select').value;
    const months = document.getElementById('months-input-roadmap').value;
    const container = document.getElementById('roadmap-container');

    if (!subject || subject === "Select Subject") return alert("Pick a subject!");

    container.innerHTML = "<p>Fetching from Cloud... ☁️</p>";

    // Fetch topics matching the subject name
    const { data: topics, error } = await supabase
        .from('master_syllabus')
        .select('topic')
        .eq('subject', subject);

    if (error || !topics || topics.length === 0) {
        container.innerHTML = "<p>No syllabus found. Check your DB spelling!</p>";
        return;
    }

    container.innerHTML = `<h3>${subject}</h3>`;

    if (mode === 'view') {
        // Mode 1: Just show the list
        topics.forEach(t => {
            container.innerHTML += `<div class="syllabus-item" style="padding:10px; border-bottom:1px solid #444;">📖 ${t.topic}</div>`;
        });
    } else {
        // Mode 2: Generate Planner based on User Input (Months)
        if (!months || months < 1) return alert("How many months do you have to study?");

        const totalWeeks = months * 4;
        const topicsPerWeek = Math.ceil(topics.length / totalWeeks);

        container.innerHTML += `<p style="color: #818cf8; margin-bottom:15px;">Plan: ${topicsPerWeek} topics/week over ${totalWeeks} weeks.</p>`;

        topics.forEach((t, i) => {
            const weekNum = Math.floor(i / topicsPerWeek) + 1;
            container.innerHTML += `
                <div class="plan-card" style="background: rgba(255,255,255,0.05); margin: 5px 0; padding: 10px; border-radius: 8px;">
                    <small style="color: #a78bfa;">WEEK ${weekNum}</small>
                    <p>${t.topic}</p>
                </div>`;
        });
    }
    if (mode === 'plan') {
        document.getElementById('download-btn').style.display = 'block';
    }
}


// This connects your HTML button to your JS function
document.getElementById('login-btn').addEventListener('click', () => {
    loginUser();
});

// Do the same for your toggle function
document.getElementById('toggle-auth-link').addEventListener('click', () => {
    toggleAuth();
});


// 1. Logic to get tasks specific to the logged-in user
function getTaskKey() {
    // If no user is logged in, use a guest key, otherwise use their unique ID
    const userId = currentUser ? currentUser.id : 'guest';
    return `tasks_${userId}`;
}

window.addNewTask = function () {
    const name = document.getElementById('task-name').value;
    const date = document.getElementById('task-date').value;
    if (!name || !date) return alert("Fill fields!");

    // Pull tasks using the USER-SPECIFIC key
    let currentTasks = JSON.parse(localStorage.getItem(getTaskKey())) || [];

    currentTasks.push({ id: Date.now(), name, date });

    // Save using the USER-SPECIFIC key
    localStorage.setItem(getTaskKey(), JSON.stringify(currentTasks));
    renderTasks();
};

function renderTasks() {
    const tbody = document.getElementById('task-list-body');
    const tasks = JSON.parse(localStorage.getItem(getTaskKey())) || [];

    tbody.innerHTML = tasks.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${t.date}</td>
            <td>Active</td>
            <td><button onclick="deleteTask(${t.id})">🗑️</button></td>
        </tr>
    `).join('');
}

// Update showDashboard to fill the Profile Bar
const originalShowDashboard = window.showDashboard;
window.showDashboard = function () {
    originalShowDashboard(); // Keep your existing logic

    // Update Profile Bar
    document.getElementById('user-display-name').innerText = currentUser.email.split('@')[0]; // Simple name from email
    document.getElementById('user-display-meta').innerText = `${window.userCourse} - Semester ${window.userSemester}`;

    saveAndRenderTasks();
}


window.toggleMenu = function () {
    document.getElementById('dropdown-menu').classList.toggle('hidden');
}

window.toggleDarkMode = function () {
    document.body.classList.toggle('light-mode'); // Assuming your CSS is Dark by default
}

window.toggleDesktopMode = function () {
    // This forces the viewport width or toggles a class on the container
    document.querySelector('.container').classList.toggle('forced-desktop');
}

// Close menu if user clicks outside
window.onclick = function (event) {
    if (!event.target.matches('.menu-trigger')) {
        const dropdown = document.getElementById('dropdown-menu');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    }
}