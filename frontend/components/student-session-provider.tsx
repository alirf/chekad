"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchStudentProfile,
  logoutStudent,
  StudentAuthError,
  type StudentProfile,
} from "../lib/student-auth";

type SessionSnapshot =
  | { status: "checking" | "guest" | "unavailable"; student: null }
  | { status: "authenticated"; student: StudentProfile };

type StudentSessionContextValue = SessionSnapshot & {
  refreshSession: () => Promise<StudentProfile | null>;
  setAuthenticated: (student: StudentProfile) => void;
  logout: () => Promise<void>;
};

const StudentSessionContext = createContext<StudentSessionContextValue | null>(null);
const SESSION_CHANNEL_NAME = "chekad-student-session";
const SESSION_STORAGE_KEY = "chekad:student-session-changed";

export function StudentSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionSnapshot>({
    status: "checking",
    student: null,
  });
  const sessionRef = useRef<SessionSnapshot>(session);
  const requestSequenceRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabId = useId();

  const commitSession = useCallback((next: SessionSnapshot) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const announceSessionChange = useCallback(() => {
    const message = { type: "session-changed", source: tabId };

    if (channelRef.current) {
      channelRef.current.postMessage(message);
      return;
    }

    // Older browsers fall back to a storage event. No credentials or profile
    // data are written to localStorage.
    try {
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ ...message, nonce: Date.now() }),
      );
    } catch {
      // Cross-tab synchronization is best-effort when browser storage is blocked.
    }
  }, [tabId]);

  const refreshSession = useCallback(async () => {
    const requestId = ++requestSequenceRef.current;
    const previous = sessionRef.current;

    if (previous.status !== "authenticated") {
      commitSession({ status: "checking", student: null });
    }

    try {
      const student = await fetchStudentProfile();
      if (requestId !== requestSequenceRef.current) {
        return sessionRef.current.student;
      }

      commitSession({ status: "authenticated", student });
      return student;
    } catch (cause) {
      if (requestId !== requestSequenceRef.current) {
        return sessionRef.current.student;
      }

      if (cause instanceof StudentAuthError && cause.status === 401) {
        commitSession({ status: "guest", student: null });
      } else if (previous.status === "authenticated") {
        // A temporary network or service failure must not look like a logout.
        commitSession(previous);
      } else {
        commitSession({ status: "unavailable", student: null });
      }

      return null;
    }
  }, [commitSession]);

  const setAuthenticated = useCallback((student: StudentProfile) => {
    requestSequenceRef.current += 1;
    commitSession({ status: "authenticated", student });
    announceSessionChange();
  }, [announceSessionChange, commitSession]);

  const logout = useCallback(async () => {
    try {
      await logoutStudent();
    } catch (cause) {
      // An already expired session is locally equivalent to a completed logout.
      if (!(cause instanceof StudentAuthError && cause.status === 401)) {
        throw cause;
      }
    }

    requestSequenceRef.current += 1;
    commitSession({ status: "guest", student: null });
    announceSessionChange();
  }, [announceSessionChange, commitSession]);

  useEffect(() => {
    void refreshSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    };

    let handleStorage: ((event: StorageEvent) => void) | undefined;

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event: MessageEvent<{ type?: string; source?: string }>) => {
        if (
          event.data?.type === "session-changed" &&
          event.data.source !== tabId
        ) {
          void refreshSession();
        }
      };
    } else {
      handleStorage = (event: StorageEvent) => {
        if (event.key !== SESSION_STORAGE_KEY || !event.newValue) return;
        try {
          const message = JSON.parse(event.newValue) as {
            type?: string;
            source?: string;
          };
          if (
            message.type === "session-changed" &&
            message.source !== tabId
          ) {
            void refreshSession();
          }
        } catch {
          // Ignore unrelated or malformed storage events.
        }
      };
      window.addEventListener("storage", handleStorage);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (handleStorage) {
        window.removeEventListener("storage", handleStorage);
      }
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [refreshSession, tabId]);

  const value: StudentSessionContextValue =
    session.status === "authenticated"
      ? {
          ...session,
          refreshSession,
          setAuthenticated,
          logout,
        }
      : {
          ...session,
          refreshSession,
          setAuthenticated,
          logout,
        };

  return (
    <StudentSessionContext.Provider value={value}>
      {children}
    </StudentSessionContext.Provider>
  );
}

export function useStudentSession() {
  const context = useContext(StudentSessionContext);
  if (!context) {
    throw new Error("useStudentSession must be used within StudentSessionProvider");
  }
  return context;
}
