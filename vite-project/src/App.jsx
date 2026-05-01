import { useState, useMemo } from "react";

export default function App() {
  const [email, setEmail] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(true);
  const [toast, setToast] = useState("");

  const [data, setData] = useState({
    expenses: [],
    selectedMonth: new Date().toISOString().slice(0, 7),
  });

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function submitEmail(e) {
    e.preventDefault();

    try {
      await fetch("https://formspree.io/f/mwaayzkv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      showToast("You're on the list 🔥");
      setEmail("");
      setShowEmailModal(false);
    } catch (err) {
      showToast("Something went wrong");
    }
  }

  const monthExpenses = useMemo(() => {
    return data.expenses;
  }, [data.expenses]);

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <h1 style={styles.title}>PlanWise 2.0</h1>
      <p style={styles.tagline}>
        Rebuilt for Clarity. Simplified for Execution.
      </p>

      {/* SIMPLE DASHBOARD */}
      <div style={styles.card}>
        <h2>Monthly Overview</h2>
        <p>Expenses tracked: {monthExpenses.length}</p>
      </div>

      {/* EMAIL MODAL */}
      {showEmailModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <button
              style={styles.close}
              onClick={() => setShowEmailModal(false)}
            >
              ✕
            </button>

            <h2>Get early access</h2>
            <p>Join the PlanWise list for updates & tools</p>

            <form onSubmit={submitEmail}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
              <button type="submit" style={styles.button}>
                Join Free
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  app: {
    fontFamily: "sans-serif",
    padding: 20,
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  tagline: {
    opacity: 0.7,
    marginBottom: 20,
  },
  card: {
    background: "#1e293b",
    padding: 20,
    borderRadius: 12,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    background: "white",
    color: "black",
    padding: 20,
    borderRadius: 12,
    width: 300,
    position: "relative",
  },
  close: {
    position: "absolute",
    top: 10,
    right: 10,
    border: "none",
    background: "none",
    fontSize: 18,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  button: {
    width: "100%",
    padding: 10,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
  },
  toast: {
    position: "fixed",
    bottom: 20,
    right: 20,
    background: "#22c55e",
    padding: 10,
    borderRadius: 6,
  },
};