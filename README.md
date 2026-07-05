# DoveTail

> A student-built platform that brings notes, lectures, previous year papers, and study planning into one place—so students spend less time searching and more time learning.

🌐 **Live Demo:** https://mydovetail.netlify.app

---

## Preview
<img width="1878" height="862" alt="Screenshot (290)" src="https://github.com/user-attachments/assets/484cf8a1-4217-4ace-a2e5-b49fd05641f6" />

<img width="1885" height="843" alt="Screenshot (289)" src="https://github.com/user-attachments/assets/32aadd35-a523-4e76-a331-d18737d055da" />

<img width="1861" height="831" alt="Screenshot (288)" src="https://github.com/user-attachments/assets/7bd8086e-d66d-4e55-8b0e-fc30cf66d994" />

<img width="1860" height="861" alt="Screenshot (286)" src="https://github.com/user-attachments/assets/52573c77-fdb7-4fe3-94bb-9ab903677ce1" />

---

## The Story Behind DoveTail

Studying was never the hardest part. Finding everything needed to study was. Every semester meant searching through WhatsApp groups, Google Drive folders, old chats, and random links just to collect notes, lecture playlists, and previous year question papers before actual studying could even begin.

DoveTail was built to solve that problem. Instead of keeping resources scattered across different platforms, DoveTail brings everything together into a single workspace where students can organize, discover, and plan their studies without unnecessary friction.

It is built **by students, for students.**

---

## Why the name "DoveTail"?

In woodworking, a **dovetail joint** is one of the strongest ways of joining two separate pieces into one. That idea inspired this project. DoveTail joins scattered academic resources and study planning into one seamless platform, creating a single place students can actually rely on throughout the semester.

---

# Features

- 🔐 Secure authentication using Supabase Auth
- 📚 Subject-wise Notes Vault
- 🎥 Save and access YouTube lecture playlists
- 📄 Previous Year Question Paper repository
- 📅 Weekly Study Planner
- ⏰ Personal deadline tracker
- ⭐ Bookmark important resources
- 👤 Personalized dashboard for every student

---

# Tech Stack

| Frontend | Backend / BaaS | Deployment |
|-----------|----------------|------------|
| HTML | Supabase Auth | Netlify |
| CSS | Supabase Database | |
| Vanilla JavaScript | Supabase Storage | |

---

# Database Design

The project uses **Supabase** as its backend.

Current database tables:

| Table | Purpose |
|--------|---------|
| profiles | User profile information |
| master_syllabus | Stores syllabus data |
| notes_vault | Notes uploaded subject-wise |
| playlists | YouTube lecture playlists |
| pyqs | Previous year question papers |
| bookmarks | User bookmarked resources |
| user_progress | Tracks study planner progress |

---

# What I Learned

Building DoveTail helped me gain practical experience with:

- User Authentication
- CRUD operations
- Database design
- File storage using Supabase
- API integration
- Session handling
- Responsive web design
- Deploying production-ready applications on Netlify

More importantly, it taught me how to build a complete product from an idea instead of just following tutorials.

---

# Challenges

Some of the biggest challenges during development included:

- Designing a database structure that kept resources organized
- Connecting frontend pages with Supabase
- Managing authentication and user sessions
- Implementing file uploads and retrieval
- Keeping the UI responsive using only HTML, CSS and Vanilla JavaScript

---

# Future Roadmap

### 🤖 AI Study Assistant

Generate personalized study plans, summarize notes, and answer academic doubts.

### 🔍 Smart Search

Search notes, lectures and PYQs instantly.

### 💬 Student Discussion Room

Allow students to collaborate, ask doubts and share resources.

### 📬 Feedback Portal

Collect feature requests and continuously improve the platform.
