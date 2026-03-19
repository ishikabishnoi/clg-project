
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

        await fetchPlaylistsFromCloud();
        await fetchNotesFromCloud();
        await fetchPYQsFromCloud();
        showDashboard();
    }
}
// LOGOUT FUNCTION
window.toggleMenu = function () {
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('hidden');
}

window.logoutUser = async function () {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("Error logging out: " + error.message);
    } else {
        // Reset local state
        currentUser = null;
        // Redirect to landing page or reload
        location.reload();
    }
}

// This part ensures the menu closes if you click anywhere else on the screen
window.addEventListener('click', function (event) {
    if (!event.target.matches('.menu-trigger')) {
        const dropdown = document.getElementById("dropdown-menu");
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    }
});

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


window.downloadPlanner = function () {
    const element = document.getElementById('roadmap-container');
    const subject = document.getElementById('subject-select').value;

    if (!element || !element.innerHTML || element.innerHTML.includes("Fetching")) {
        return alert("Generate a plan first!");
    }

    // 1. Add a class to force PDF-friendly styles (White bg, Black text)
    // This uses the CSS class we discussed earlier
    element.classList.add('pdf-export-mode');

    const opt = {
        margin: [0.5, 0.5],
        filename: `${subject.replace(/\s+/g, '_')}_Study_Plan.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollY: 0
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // 2. Use the "from" method with a promise to ensure rendering is captured
    html2pdf().set(opt).from(element).save().then(() => {
        // 3. Clean up: Remove the PDF class so your dashboard stays dark/cool
        element.classList.remove('pdf-export-mode');
        console.log("PDF Downloaded successfully");
    }).catch(err => {
        element.classList.remove('pdf-export-mode');
        console.error("PDF Error:", err);
        alert("Failed to generate PDF. Check console.");
    });
};


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

window.onload = function () {
    console.log("App initialized.");

    // Check if we have a session to fetch cloud data immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            currentUser = session.user;
            fetchPlaylistsFromCloud(); // Pull fresh data from backend
        }
    });

    const savedTotal = localStorage.getItem('totalTopicsCount');
    const totalEl = document.getElementById('stat-total');
    if (savedTotal && totalEl) {
        totalEl.innerText = savedTotal;
    }
};


window.showSection = function (sectionId) {
    // 1. Hide all sections
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(s => s.classList.add('hidden'));

    // 2. Show the target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');

        // 3. RUN SYNC LOGIC BASED ON THE SECTION
        if (sectionId === 'notes-section') {
            fetchNotesFromCloud();
            renderNotes();
        }

        if (sectionId === 'profile-section') {
            // This is the "Study Vault" sync we just built
            if (typeof syncVault === "function") syncVault();
        }
    }

    // 4. Close the menu automatically after clicking
    const menu = document.getElementById('dropdown-menu');
    if (menu) menu.classList.add('hidden');
};

//save function for Notes
function saveNotes() {
    const noteData = document.getElementById('quick-notes').value;
    localStorage.setItem('savedNotes', noteData);
    alert("Notes saved to browser memory! ✅");
}
// Array to store notes references
let savedNotes = JSON.parse(localStorage.getItem('studyNotesVault')) || [];

window.addNoteLink = async function addNoteLink() {
    const subject = document.getElementById('note-subject').value;
    const fileInput = document.getElementById('note-file');

    if (!subject || fileInput.files.length === 0) return alert("Select a file first!");

    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`; // Better naming than Math.random()

    try {
        // 1. Upload to Storage
        let { error: uploadError } = await supabase.storage
            .from('notes_files')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. GET THE REAL PUBLIC URL (This is what was missing!)
        const { data: urlData } = supabase.storage
            .from('notes_files')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // 3. Insert into Table (Force is_public to true)
        const { error: dbError } = await supabase
            .from('notes_vault')
            .insert([{
                subject: subject,
                file_name: file.name,
                file_url: publicUrl, // Saving the full https:// link
                user_id: currentUser.id,
                is_public: true // Force public
            }]);

        if (dbError) throw dbError;

        alert("Note saved to Vault! ✨");

        // Clear inputs
        document.getElementById('note-subject').value = '';
        fileInput.value = '';

        // 4. Refresh both views
        fetchNotesFromCloud();
        if (typeof updateProfileVault === "function") updateProfileVault();

    } catch (err) {
        alert("Error: " + err.message);
    }
}

function renderNotes() {
    const list = document.getElementById('notes-list');
    if (!list) return;
    list.innerHTML = '';

    savedNotes.forEach((note) => {
        list.innerHTML += `
            <li style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid #6a5af9;">
                <div>
                    <strong style="color: #fff;">${note.subject}</strong><br>
                    <span style="font-size: 0.85rem; color: #aaa;">📄 ${note.file_name || 'Note'}</span>
                </div>
                <a href="${note.file_url}" target="_blank" style="color: #6a5af9; text-decoration: none; font-size: 0.9rem;">View ↗</a>
            </li>
        `;
    });
}

// This only hides it for the CURRENT user's browser
window.hideFromProfile = function (id, type) {
    if (!confirm(`Hide this ${type} from your profile view? (It will remain in the public vault)`)) return;

    // Save the hidden ID to localStorage
    let hiddenItems = JSON.parse(localStorage.getItem('hidden_items')) || [];
    hiddenItems.push(id);
    localStorage.setItem('hidden_items', JSON.stringify(hiddenItems));

    // Refresh the profile view
    updateProfileVault();
};

window.updateProfileVault = async function () {
    const hiddenItems = JSON.parse(localStorage.getItem('hidden_items')) || [];

    // 1. Fetch ALL notes from Supabase
    const { data: notes, error } = await supabase.from('notes_vault').select('*');
    if (error) return console.error(error);

    const savedNotesContainer = document.getElementById('saved-notes');
    if (savedNotesContainer) {
        // FILTER: Only show notes that ARE NOT in the hiddenItems list
        const visibleNotes = notes.filter(n => !hiddenItems.includes(n.id));

        savedNotesContainer.innerHTML = visibleNotes.map(n => `
            <div class="card" style="margin-bottom: 10px; border-left: 4px solid #6a5af9; position: relative;">
                <button onclick="hideFromProfile('${n.id}', 'note')" 
                        style="position: absolute; right: 10px; top: 10px; background:none; border:none; cursor:pointer;">🗑️</button>
                <small style="color: #94a3b8;">${n.subject}</small>
                <p><a href="${n.file_url}" target="_blank" style="color: #6a5af9; font-weight:bold; text-decoration:none;">📄 Open</a></p>
            </div>
        `).join('') || '<p style="font-size:0.8rem; color:#94a3b8;">Vault is empty.</p>';
    }
}

const originalShowSection = showSection;
showSection = function (sectionId) {
    originalShowSection(sectionId);
    if (sectionId === 'notes-section') {
        renderNotes();
    }
}


function getYoutubeID(url) {
    // This looks for 'v=' (video) or 'list=' (playlist)
    const vidMatch = url.match(/[?&]v=([^&#]+)/);
    const listMatch = url.match(/[?&]list=([^&#]+)/);

    if (vidMatch) return vidMatch[1];
    if (listMatch) return listMatch[1]; // Returns the playlist ID
    return null;
}

window.addPlaylist = async function () {
    const title = document.getElementById('playlist-title').value; // e.g., "Intro to Java"
    const url = document.getElementById('playlist-url').value;
    // If you add the 'subject' column via SQL, you can also pull the current subject:
    const subject = document.getElementById('subject-select')?.value || "General";

    if (!title || !url.includes('youtube.com')) {
        alert("Please enter a valid Topic Name and YouTube link!");
        return;
    }

    try {
        const { data, error } = await supabase
            .from('playlists')
            .insert([{
                title: title,
                url: url,
                subject: subject,
                user_id: currentUser.id,
                is_public: true
            }]);

        if (error) throw error;

        alert("Playlist saved to Vault! ✨");
        document.getElementById('playlist-title').value = '';
        document.getElementById('playlist-url').value = '';

        fetchPlaylistsFromCloud();

    } catch (err) {
        alert("Cloud Sync Error: " + err.message);
    }
};

function renderPlaylists() {
    const container = document.getElementById('playlist-container');
    const playlists = JSON.parse(localStorage.getItem('userPlaylists')) || [];

    if (playlists.length === 0) {
        container.innerHTML = '<p style="color: #64748b; grid-column: 1/-1;">No playlists saved yet.</p>';
        return;
    }

    container.innerHTML = playlists.map(p => `
    <div class="card" style="background: white; color: black; padding: 15px; border-radius: 12px; position: relative;">
        <h4 style="margin-right: 10px;">${p.title}</h4>
        <a href="${p.url}" target="_blank" style="color: #6a5af9; font-size: 0.8rem; font-weight: bold;">Watch on YouTube ↗</a>
    </div>
`).join('');
}

// This only hides it for the CURRENT user's browser
window.hideFromProfile = function (id, type) {
    if (!confirm(`Hide this ${type} from your profile view? (It will remain in the public vault)`)) return;

    // Save the hidden ID to localStorage
    let hiddenItems = JSON.parse(localStorage.getItem('hidden_items')) || [];
    hiddenItems.push(id);
    localStorage.setItem('hidden_items', JSON.stringify(hiddenItems));

    // Refresh the profile view
    updateProfileVault();
};

// Call this once when the page loads
renderPlaylists();

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
    if (!currentUser) return; // Safety check

    const { data, error } = await supabase
        .from('notes_vault') // FIXED: Matches your addNoteLink table name
        .select('*')
        .or(`user_id.eq.${currentUser.id},is_public.eq.true`);

    if (error) {
        console.error("Fetch error:", error.message);
        return;
    }

    if (data) {
        savedNotes = data.map(n => ({
            subject: n.subject,
            fileName: n.file_name,
            file_url: n.file_url,
            id: n.id
        }));

        renderNotes();
    }
}

supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        // Trigger the Global Sync
        fetchPlaylistsFromCloud();
        fetchPYQsFromCloud();
        fetchNotesFromCloud();
    }
});

async function fetchPlaylistsFromCloud() {

    const { data, error } = await supabase
        .from('playlists')
        .select('*'); // This pulls EVERYTHING from the table

    if (error) {
        console.error("Error fetching playlists:", error);
    } else {
        localStorage.setItem('userPlaylists', JSON.stringify(data));
        renderPlaylists();
    }
}


window.handleSyllabusAction = async function (mode) {
    const subject = document.getElementById('subject-select').value;
    const months = document.getElementById('months-input-roadmap').value;
    const container = document.getElementById('roadmap-container');

    if (!subject || subject === "Select Subject") return alert("Pick a subject!");

    container.innerHTML = "<p>Fetching from Cloud... ☁️</p>";

    const { data: rawData, error } = await supabase
        .from('master_syllabus')
        .select('topic')
        .eq('subject', subject);

    if (error || !rawData || rawData.length === 0) {
        container.innerHTML = "<p>No syllabus found. Check your DB spelling!</p>";
        return;
    }

    let allTopics = [];
    rawData.forEach(row => {
        // Splits by commas OR new lines, then cleans up extra spaces
        const splitItems = row.topic.split(/,|\n/).map(t => t.trim()).filter(t => t !== "");
        allTopics = allTopics.concat(splitItems);
    });
    // -----------------------------------------

    container.innerHTML = `<h3>${subject}</h3>`;

    if (mode === 'view') {
        allTopics.forEach(t => {
            container.innerHTML += `<div class="syllabus-item" style="padding:10px; border-bottom:1px solid #444;">📖 ${t}</div>`;
        });
    } else {
        if (!months || months < 1) return alert("How many months do you have to study?");

        const totalWeeks = months * 4;
        // Accurate math based on the SPLIT list
        const topicsPerWeek = (allTopics.length / totalWeeks).toFixed(1);

        container.innerHTML += `<p style="color: #818cf8; margin-bottom:15px;">Plan: ${topicsPerWeek} topics/week over ${totalWeeks} weeks.</p>`;

        allTopics.forEach((t, i) => {
            const weekNum = Math.floor(i / Math.ceil(allTopics.length / totalWeeks)) + 1;
            container.innerHTML += `
                <div class="plan-card" style="background: rgba(255,255,255,0.05); margin: 5px 0; padding: 10px; border-radius: 8px;">
                    <small style="color: #a78bfa;">WEEK ${weekNum}</small>
                    <p>${t}</p>
                </div>`;
        });
    }

    const btn = document.getElementById('download-btn');
    if (btn) btn.style.display = (mode === 'plan') ? 'block' : 'none';
};


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
    if (!tbody) return; // Safety check

    const tasks = JSON.parse(localStorage.getItem(getTaskKey())) || [];

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5;">No pending tasks! 🍵</td></tr>';
        return;
    }

    tbody.innerHTML = tasks.map(t => `
        <tr>
            <td style="color: white;">${t.name}</td>
            <td style="color: #94a3b8;">${t.date}</td>
            <td>
                <button onclick="deleteTask(${t.id})" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">🗑️</button>
            </td>
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

// 1. Dark Mode / Light Mode Logic
window.toggleDarkMode = function () {
    // We toggle a 'light-mode' class on the body
    document.body.classList.toggle('light-mode');

    // Optional: Save preference
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
};

// 2. Desktop / Mobile View Logic
window.toggleDesktopMode = function () {
    // We toggle a 'mobile-view' class on the container
    const container = document.querySelector('.container');
    container.classList.toggle('mobile-view');

    // Update button text or icon if you want
    const status = container.classList.contains('mobile-view') ? 'Mobile' : 'Desktop';
    console.log("View Mode:", status);
};

// Close menu if user clicks outside
window.onclick = function (event) {
    if (!event.target.matches('.menu-trigger')) {
        const dropdown = document.getElementById('dropdown-menu');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    }
}

// Function to update the Profile Section with current user data
function updateProfileVault() {
    const userData = JSON.parse(localStorage.getItem('currentUser'));
    if (userData) {
        // Update the Profile Section Header
        const profileHeader = document.querySelector('#profile-section h1');
        profileHeader.innerText = `${userData.email.split('@')[0]}'s Study Vault 👤`;

        // Sync the playlists and notes from the main sections to the profile cards
        document.getElementById('saved-lectures').innerHTML = document.getElementById('playlist-container').innerHTML;
        document.getElementById('saved-notes').innerHTML = document.getElementById('notes-list').innerHTML;
    }
}


window.logoutUser = async function () {
    await supabase.auth.signOut();
    location.reload(); // Takes them back to the landing page
}


window.deleteTask = function (id) {
    if (!confirm("Are you sure you want to remove this task?")) return;

    // Get the correct key for this specific user
    const key = getTaskKey();
    // Pull the current tasks from Local Storage
    let currentTasks = JSON.parse(localStorage.getItem(key)) || [];
    // Filter out the task that matches the ID we clicked
    const updatedTasks = currentTasks.filter(task => task.id !== id);
    //  Save the new list back to Local Storage
    localStorage.setItem(key, JSON.stringify(updatedTasks));

    renderTasks();
};

window.savePYQLink = async function () {
    const link = document.getElementById('pyq-link-input').value;
    const subject = document.getElementById('subject-select')?.value || "General";

    if (!link) return alert("Paste a link first!");

    try {
        // 1. Save to Supabase (Cloud Sync)
        const { data, error } = await supabase
            .from('pyqs')
            .insert([{
                url: link,
                subject: subject,
                // Assuming you want to link it to the user like the others
                user_id: currentUser.id
            }]);

        if (error) throw error;

        // 2. Local fallback & Success Alert
        localStorage.setItem('pyq_drive_link', link);
        alert("Drive link synced to Vault! 🔗");

        // 3. UI Refresh
        renderPYQ();
        if (typeof updateProfileVault === "function") updateProfileVault();

    } catch (err) {
        console.error("PYQ Sync Error:", err.message);
        alert("Failed to sync link: " + err.message);
    }
};

function renderPYQ() {
    const link = localStorage.getItem('pyq_drive_link');
    const display = document.getElementById('pyq-display');
    if (!display) return;

    if (link) {
        display.innerHTML = `
            <div class="card" style="background: rgba(106, 90, 249, 0.1); border: 1px dashed #6a5af9; padding: 15px; text-align: center; margin-top:10px;">
                <p style="font-size: 0.8rem; margin-bottom: 10px;">Drive Folder Connected</p>
                <a href="${link}" target="_blank" style="color: #6a5af9; font-weight: bold; text-decoration: none; font-size: 0.9rem;">📂 Open Drive</a>
            </div>
        `;
    } else {
        display.innerHTML = '<p style="color: #64748b; font-size: 0.8rem;">No Drive link connected.</p>';
    }
}

window.deletePYQ = function () {
    if (confirm("Disconnect the Drive link?")) {
        localStorage.removeItem('pyq_drive_link');
        document.getElementById('pyq-link-input').value = '';
        renderPYQ();
    }
};

async function fetchPYQsFromCloud() {
    const { data, error } = await supabase
        .from('pyqs')
        .select('url')
        .order('created_at', { ascending: false }); // Get all links, newest first

    if (data && data.length > 0) {
        // You can either show the latest one or a list. 
        // For now, let's keep the latest one visible globally:
        localStorage.setItem('pyq_drive_link', data[0].url);
        renderPYQ();
    }
}