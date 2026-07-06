import time
import threading
from typing import List, Dict

MAX_HISTORY = 12
MAX_SESSIONS = 1000
SESSION_TTL = 3600

class ConversationMemory:
    def __init__(self):
        self._store: Dict[str, List[Dict]] = {}
        self._timestamps: Dict[str, float] = {}
        self._lock = threading.Lock()

    def add_message(self, session_id: str, role: str, content: str):
        if role not in ["user", "assistant"]:
            raise ValueError("Role must be 'user' or 'assistant'")
            
        with self._lock:
            self._evict_expired()
            
            if session_id not in self._store:
                if len(self._store) >= MAX_SESSIONS:
                    # Evict oldest
                    oldest = min(self._timestamps, key=self._timestamps.get)
                    del self._store[oldest]
                    del self._timestamps[oldest]
                self._store[session_id] = []
                
            self._store[session_id].append({
                "role": role,
                "content": content,
                "timestamp": time.time()
            })
            
            if len(self._store[session_id]) > MAX_HISTORY:
                self._store[session_id] = self._store[session_id][-MAX_HISTORY:]
                
            self._timestamps[session_id] = time.time()

    def get_history(self, session_id: str) -> List[Dict]:
        with self._lock:
            if session_id not in self._store:
                return []
            if time.time() - self._timestamps.get(session_id, 0) > SESSION_TTL:
                self.clear_session(session_id)
                return []
            return self._store[session_id].copy()

    def get_context_string(self, session_id: str) -> str:
        history = self.get_history(session_id)
        if not history:
            return ""
            
        recent = history[-6:]
        lines = []
        for msg in recent:
            role = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content']}")
        return "\n".join(lines)

    def clear_session(self, session_id: str) -> bool:
        with self._lock:
            existed = session_id in self._store
            if existed:
                del self._store[session_id]
                del self._timestamps[session_id]
            return existed

    def get_stats(self) -> Dict:
        with self._lock:
            active_sessions = len(self._store)
            total_messages = sum(len(msgs) for msgs in self._store.values())
            
            if self._timestamps:
                oldest_ts = min(self._timestamps.values())
                oldest_age = time.time() - oldest_ts
            else:
                oldest_age = 0.0
                
            return {
                "active_sessions": active_sessions,
                "total_messages": total_messages,
                "oldest_session_age": oldest_age
            }

    def _evict_expired(self):
        now = time.time()
        expired = [sid for sid, ts in self._timestamps.items() if now - ts > SESSION_TTL]
        for sid in expired:
            del self._store[sid]
            del self._timestamps[sid]

memory = ConversationMemory()
