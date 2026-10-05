# ✨ Linachat - Friendly AI Chatbot (Tamil • Tanglish • English)

**Linachat** is a personalized conversational AI assistant trained on a tailored persona using **Ollama** and **Llama 3.2**. It understands and responds naturally in **Tamil (தமிழ்), Tanglish, and English** with built-in **India Standard Time (IST)** awareness and localized food, coding, and general knowledge.

---

## 🚀 Quick Start Options

You have 3 ways to use Linachat right now:

### 1. 🌐 Web Chat Application (Recommended)
A modern, dark-themed, glassmorphic web interface with real-time streaming, suggestions, markdown, and an IST clock:

```bash
# Start the web server
npm start
```
Then open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 2. ⚡ Direct Terminal Chat (Ollama CLI)
You can directly chat with the model inside your terminal anytime:

```bash
ollama run linachat
```
Example conversation:
```
>>> Vanakkam! Enna pandra?
>>> Easy-ah oru Thakkali Thokku recipe sollu.
>>> Python-la list comprehension epdi use panrathu?
```

---

### 3. 🐍 Python Interactive Chat
Run the included Python CLI client:

```bash
python chat.py
```

---

## 📁 Project Structure

```
Linachat/
├── Modelfile         # Ollama model definition with the complete Linachat persona
├── server.js         # Node.js backend server with IST injection & streaming proxy
├── package.json      # Project configuration & start scripts
├── chat.py           # Terminal Python chat client
├── public/
│   ├── index.html    # Modern UI layout with starter cards & live clock
│   ├── style.css     # Glassmorphic dark theme, responsive styling & animations
│   └── app.js        # SSE stream parser, markdown renderer & client logic
└── README.md         # Documentation
```

---

## 🛠️ How to Rebuild or Customize the Model

If you ever want to update Linachat's system instructions or parameters:

1. Open `Modelfile` and edit the `SYSTEM` instructions or parameters (`temperature`, etc.).
2. Run the build command:
   ```bash
   ollama create linachat -f Modelfile
   ```
3. That's it! The new model is instantly available to both the Web UI and Ollama CLI.

---

## 🌟 Key Features

* **Multi-lingual**: Seamlessly understands and switches between English, Tamil (தமிழ்), and Tanglish.
* **IST Date & Time Aware**: Dynamically receives India Standard Time (UTC+5:30) so it never guesses the time.
* **Cooking & Tamil Food**: Step-by-step recipes for South Indian and Tamil dishes (Thakkali Thokku, Sambar, Biryani, etc.).
* **Coding & Education**: Beginner-friendly explanations with complete, working code.
* **Warm & Conversational**: Direct, friendly personality without robotic disclaimers.
