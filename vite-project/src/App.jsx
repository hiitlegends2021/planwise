import { useMemo, useState } from "react";

const FORM_ENDPOINT = "https://formspree.io/f/mvvaayzk";

export default function App() {
  const [email, setEmail] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(
    !localStorage.getItem("planwise_email_joined")
  );
  const [toast, setToast] = useState("");

  const [income, setIncome] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenses, setExpenses] = useState([]);

  const totalIncome = Number(income || 0);
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );
  const remaining = totalIncome - totalExpenses;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function submitEmail(e) {
    e.preventDefault();

    if (!email.includes("@")) {
      showToast("Enter a valid email");
      return;
    }

    try {
      await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "PlanWise 2.0" }),
      });

      localStorage.setItem("planwise_email_joined", "true");
      localStorage.setItem("planwise_email", email);

      setEmail("");
      setShowEmailModal(false);
      showToast("PlanWise unlocked ✅");
    } catch {
      showToast("Email capture failed. Try again.");
    }
  }

  function addExpense(e) {
    e.preventDefault();

    if (!expenseName.trim() || !expenseAmount) {
      showToast("Add an expense name and amount");
      return;
    }

    setExpenses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: expenseName.trim(),
        amount: Number(expenseAmount),
      },
    ]);

    setExpenseName("");
    setExpenseAmount("");
    showToast("Expense added");
  }

  function resetPlan() {
    setIncome("");
    setExpenseName("");
    setExpenseAmount("");
    setExpenses([]);
    showToast("Plan reset");
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div>
          <p style={styles.badge}>PlanWise Free</p>
          <h1 style={styles.title}>PlanWise 2.0</h1>
          <p style={styles.tagline}>
            Rebuilt for Clarity. Simplified for Execution.
          </p>
        </div>

        <button style={styles.secondaryButton} onClick={() => setShowEmailModal(true)}>
          Join List
        </button>
      </header>

      <section style={styles.heroCard}>
        <h2 style={styles.sectionTitle}>Start your monthly money plan</h2>
        <p style={styles.helper}>
          Add your income, track expenses, and see what you really have left.
        </p>

        <label style={styles.label}>Monthly income</label>
        <input
          style={styles.input}
          type="number"
          inputMode="decimal"
          placeholder="Example: 2500"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
      </section>

      <section style={styles.grid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Income</p>
          <h3 style={styles.metricValue}>${totalIncome.toFixed(2)}</h3>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Expenses</p>
          <h3 style={styles.metricValue}>${totalExpenses.toFixed(2)}</h3>
        </div>

        <div style={styles.metricCardHighlight}>
          <p style={styles.metricLabel}>Remaining</p>
          <h3 style={styles.metricValue}>${remaining.toFixed(2)}</h3>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Add an expense</h2>

        <form onSubmit={addExpense} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Expense name"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
          />

          <input
            style={styles.input}
            type="number"
            inputMode="decimal"
            placeholder="Amount"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
          />

          <button style={styles.primaryButton} type="submit">
            Add Expense
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <h2 style={styles.sectionTitle}>Expenses tracked: {expenses.length}</h2>
          <button style={styles.resetButton} onClick={resetPlan}>
            Reset
          </button>
        </div>

        {expenses.length === 0 ? (
          <p style={styles.empty}>
            No expenses yet. Add your first bill, subscription, or spending item.
          </p>
        ) : (
          <div style={styles.expenseList}>
            {expenses.map((item) => (
              <div key={item.id} style={styles.expenseRow}>
                <span>{item.name}</span>
                <strong>${Number(item.amount).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      {showEmailModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <button style={styles.close} onClick={() => setShowEmailModal(false)}>
              ×
            </button>

            <p style={styles.badge}>PlanWise Free</p>
            <h2 style={styles.modalTitle}>Unlock smarter money tools</h2>
            <p style={styles.modalText}>
              Join the PlanWise list for product updates, budgeting tips, and early access to Pro features.
            </p>

            <form onSubmit={submitEmail}>
              <input
                style={styles.input}
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button style={styles.primaryButton} type="submit">
                Get My Plan
              </button>
            </form>

            <button style={styles.textButton} onClick={() => setShowEmailModal(false)}>
              Continue Free
            </button>
          </div>
        </div>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#fff",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    padding: "28px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
    marginBottom: "28px",
  },
  badge: {
    display: "inline-block",
    background: "#eaf1ff",
    color: "#2563eb",
    fontWeight: 800,
    padding: "8px 14px",
    borderRadius: "999px",
    margin: "0 0 12px",
  },
  title: {
    fontSize: "42px",
    margin: 0,
    letterSpacing: "-1px",
  },
  tagline: {
    color: "#94a3b8",
    fontSize: "18px",
    marginTop: "10px",
  },
  heroCard: {
    background: "#1e293b",
    borderRadius: "24px",
    padding: "24px",
    marginBottom: "18px",
  },
  card: {
    background: "#1e293b",
    borderRadius: "24px",
    padding: "24px",
    marginTop: "18px",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: "24px",
  },
  helper: {
    color: "#cbd5e1",
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 800,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    marginTop: "10px",
    fontSize: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  metricCard: {
    background: "#111827",
    padding: "20px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  metricCardHighlight: {
    background: "linear-gradient(135deg, #0f172a, #2563eb)",
    padding: "20px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  metricLabel: {
    color: "#cbd5e1",
    margin: 0,
  },
  metricValue: {
    fontSize: "28px",
    margin: "8px 0 0",
  },
  form: {
    display: "grid",
    gap: "10px",
  },
  primaryButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #0f172a, #2563eb)",
    color: "#fff",
    fontWeight: 900,
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "10px",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    background: "transparent",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  resetButton: {
    border: "none",
    background: "#334155",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "12px",
    cursor: "pointer",
  },
  textButton: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#64748b",
    padding: "14px",
    fontWeight: 900,
    fontSize: "16px",
    cursor: "pointer",
  },
  rowBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  empty: {
    color: "#94a3b8",
  },
  expenseList: {
    display: "grid",
    gap: "10px",
    marginTop: "14px",
  },
  expenseRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    background: "#0f172a",
    padding: "14px",
    borderRadius: "14px",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.72)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    color: "#0f172a",
    borderRadius: "26px",
    padding: "26px",
    position: "relative",
    boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
  },
  close: {
    position: "absolute",
    top: "18px",
    right: "18px",
    border: "none",
    background: "transparent",
    fontSize: "28px",
    color: "#64748b",
    cursor: "pointer",
  },
  modalTitle: {
    fontSize: "30px",
    lineHeight: 1.05,
    margin: "8px 0 12px",
  },
  modalText: {
    color: "#475569",
    lineHeight: 1.55,
  },
  toast: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#22c55e",
    color: "#052e16",
    padding: "12px 16px",
    borderRadius: "14px",
    fontWeight: 900,
    zIndex: 99,
  },
};