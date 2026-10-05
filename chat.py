"""
Linachat - Terminal Interactive Chat
Runs Linachat locally using Ollama API.
"""

import sys
import json
import urllib.request
from datetime import datetime
import zoneinfo

OLLAMA_API = "http://127.0.0.1:11434/api/chat"
MODEL = "linachat"

def get_ist_time():
    try:
        ist = zoneinfo.ZoneInfo("Asia/Kolkata")
        now = datetime.now(ist)
    except Exception:
        now = datetime.now()
    return now.strftime("%A, %d %B %Y, %I:%M:%S %p IST")

def chat_stream(messages):
    current_time = get_ist_time()
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": f"[SYSTEM CONTEXT: Current IST Date & Time: {current_time}]"},
            *messages
        ],
        "stream": True
    }
    
    req = urllib.request.Request(
        OLLAMA_API,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req) as response:
            full_reply = ""
            for line in response:
                if not line:
                    continue
                try:
                    data = json.loads(line.decode("utf-8"))
                    chunk = data.get("message", {}).get("content", "")
                    sys.stdout.write(chunk)
                    sys.stdout.flush()
                    full_reply += chunk
                except Exception:
                    continue
            print("\n")
            return full_reply
    except urllib.error.URLError as e:
        print(f"\n[Error connecting to Ollama: {e}. Make sure 'ollama serve' is running!]")
        return None

def main():
    print("=" * 60)
    print("✨ Linachat Terminal Chat (Tamil • Tanglish • English) ✨")
    print(f"⏰ System Time: {get_ist_time()}")
    print("Type 'exit' or 'quit' to end chat. Type 'clear' to reset memory.")
    print("=" * 60)

    history = []

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit"]:
                print("Linachat: Paathukalam! Take care! Bye 👋")
                break
            if user_input.lower() == "clear":
                history = []
                print("[Chat memory cleared!]")
                continue

            history.append({"role": "user", "content": user_input})
            sys.stdout.write("Linachat: ")
            sys.stdout.flush()

            reply = chat_stream(history)
            if reply:
                history.append({"role": "assistant", "content": reply})

        except KeyboardInterrupt:
            print("\nGoodbye! 👋")
            break

if __name__ == "__main__":
    main()
