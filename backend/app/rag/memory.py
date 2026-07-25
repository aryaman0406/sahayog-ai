import time
import threading
from typing import List, Dict, Optional

MAX_HISTORY = 12
MAX_SESSIONS = 1000
SESSION_TTL = 3600

class ConversationMemory:
    def __init__(self):
        self._store: Dict[str, List[Dict]] = {}
        self._timestamps: Dict[str, float] = {}
        self._active_scheme: Dict[str, Dict] = {}  # session_id -> full scheme dict
        self._lock = threading.Lock()

    def add_message(self, session_id: str, role: str, content: str):
        if role not in ["user", "assistant"]:
            raise ValueError("Role must be 'user' or 'assistant'")

        with self._lock:
            self._evict_expired()

            if session_id not in self._store:
                if len(self._store) >= MAX_SESSIONS:
                    oldest = min(self._timestamps, key=self._timestamps.get)
                    del self._store[oldest]
                    del self._timestamps[oldest]
                    self._active_scheme.pop(oldest, None)
                self._store[session_id] = []

            self._store[session_id].append({
                "role": role,
                "content": content,
                "timestamp": time.time()
            })

            if len(self._store[session_id]) > MAX_HISTORY:
                self._store[session_id] = self._store[session_id][-MAX_HISTORY:]

            self._timestamps[session_id] = time.time()

    # ── Active scheme tracking ────────────────────────────────────────────────

    def set_active_scheme(self, session_id: str, scheme: Dict):
        """Store the scheme currently being discussed in this session."""
        if not scheme:
            return
        with self._lock:
            self._active_scheme[session_id] = scheme

    def get_active_scheme(self, session_id: str) -> Optional[Dict]:
        """Return the scheme currently being discussed, or None."""
        with self._lock:
            return self._active_scheme.get(session_id)

    def clear_active_scheme(self, session_id: str):
        with self._lock:
            self._active_scheme.pop(session_id, None)

    # ── History helpers ───────────────────────────────────────────────────────

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
            self._active_scheme.pop(session_id, None)
            return existed

    def get_stats(self) -> Dict:
        with self._lock:
            active_sessions = len(self._store)
            total_messages = sum(len(msgs) for msgs in self._store.values())
            oldest_age = (
                time.time() - min(self._timestamps.values())
                if self._timestamps else 0.0
            )
            return {
                "active_sessions": active_sessions,
                "total_messages": total_messages,
                "oldest_session_age": oldest_age,
            }

    def _evict_expired(self):
        now = time.time()
        expired = [sid for sid, ts in self._timestamps.items() if now - ts > SESSION_TTL]
        for sid in expired:
            del self._store[sid]
            del self._timestamps[sid]
            self._active_scheme.pop(sid, None)

memory = ConversationMemory()
