# 🎤 VoiceWaiter — Voice-Controlled PWA for Restaurants

> Hands‑free order management system for waiters, built as a Progressive Web App (PWA).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)  
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue.svg)](https://web.dev/progressive-web-apps/)  
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)  
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-green.svg)](#deployment)

---

## 📖 Overview

**VoiceWaiter** is a voice-controlled Progressive Web Application designed for restaurant environments.  

It enables waiters to:
- Take orders using voice commands
- Manage tables hands‑free
- Reduce screen interaction
- Improve speed and hygiene

The project demonstrates real-world application of modern browser technologies including **Web Speech API**, **Service Workers**, and **PWA architecture**.



## 🚀 Live Demo

👉 https://your-username.github.io/resto-voicectrl-pwa-development/
UI FRAME to go UI-RESTO-VOICE.jpg

*(Replace with your actual GitHub Pages URL)*



## 🎯 Problem It Solves

In busy restaurants:

- Waiters handle multiple tables simultaneously
- Hands are often occupied
- Touching devices repeatedly reduces hygiene
- Typing orders takes time

✅ VoiceWaiter solves this by enabling **hands-free interaction**.



## ✨ Key Features

### 🎙 Voice Recognition
- Real-time speech-to-text using Web Speech API
- Natural voice commands for order entry
- Instant UI updates

### 🍽 Restaurant Logic
- Table management system
- Add items to specific tables
- Clear table status
- Generate bill command (UI-level)

### 📱 Progressive Web App
- Installable on Android, iOS, Desktop
- Offline support via Service Worker
- Fast loading with caching
- Standalone app experience

### ⚡ Performance Focused
- Zero frameworks
- Lightweight architecture
- Clean, modular JavaScript



## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5, CSS3 |
| Logic | Vanilla JavaScript |
| Voice | Web Speech API |
| Offline | Service Worker |
| PWA | Web App Manifest |
| Hosting | GitHub Pages |
| Version Control | Git + GitHub |



## 🏗 Architecture

```
index.html
│
├── styles.css          → UI styling
├── app.js              → Core application logic
├── voice.js            → Speech recognition module
├── service-worker.js   → Offline caching
├── manifest.json       → PWA configuration
└── icon.svg            → App icon
```

### Flow:

1. User presses microphone button
2. `voice.js` activates SpeechRecognition
3. Command is parsed
4. `app.js` updates UI state
5. Service Worker caches resources



## 🎙 Example Voice Commands

| Command | Action |
|----------|--------|
| "Add two steaks to table five" | Adds order |
| "Clear table three" | Resets table |
| "Show drinks menu" | Displays category |
| "Bill table seven" | Prepares check |

---

## 📦 Installation (Local Development)

> ⚠ Service Worker requires HTTP/HTTPS (not file://)

### Clone the repository:

```bash
git clone https://github.com/your-username/voice-controlled-pwa-development.git
cd voice-controlled-pwa-development
```

### Run local server:

```bash
npx serve .
```

Open:

```
http://localhost:3000
```



## 🌍 Deployment

This project is deployed using **GitHub Pages** via GitHub Actions.

Each push to the `main` branch automatically triggers deployment.

To configure:

1. Go to **Settings → Pages**
2. Set Source to **GitHub Actions**



## 📱 Install as App

1. Open in Chrome (recommended)
2. Click the install icon in the address bar
3. Add to Home Screen
4. Launch like a native app



## 🌐 Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|----------|:------:|:----:|:------:|:-------:|
| PWA Install | ✅ | ✅ | ⚠️ | ⚠️ |
| Speech Recognition | ✅ | ✅ | ❌ | ❌ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |

> Recommended browser: **Google Chrome**



## 🧠 What This Project Demonstrates

✅ Real-world problem solving  
✅ Understanding of PWA architecture  
✅ Experience with browser APIs  
✅ Modular JavaScript design  
✅ Offline-first approach  
✅ Clean project structure  
✅ Deployment automation  

Perfect portfolio project for:
- Frontend Developer
- JavaScript Developer
- PWA Developer
- Junior / Middle Web Developer roles



## 🗺 Future Improvements

- Backend integration (Node.js / Firebase)
- Multi-waiter synchronization
- Voice command NLP improvements
- Kitchen display system
- Analytics dashboard
- Dark mode
- Unit testing



## 📜 License

MIT License



## 👨‍💻 Author

**Nurlybek Abiltaev**

GitHub: https://github.com/nurlbekabiltaevvv  
Email: nurlybekabiltaevvv@gmail.com
