import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "planwise_free_v2";
const WELCOME_KEY = "planwise_welcome_seen_v2";
const EMAIL_KEY = "planwise_email_joined";

const BREVO_FORM_URL =
"https://fdf4b675.sibforms.com/serve/MUIFAHn3K6qVg91Z6Jv6wc75NQjenjIeYfIMBWcUY4mMgZMVWsC12NQKWzuFkdHod333aPsTDM_yJNFKpTfMfNcftX2DhGh-JUaFBReZKJ_D1o5tvfXOrdcXGYS962v3xGAui6k-FWutjVhj5Y1JmX6Jqi8ADa4-gJL07i_25aTtru6XYB2d6aL-zwFwkRB5Pl0Bs6O6hGroT2FgZw==";

const currency = new Intl.NumberFormat("en-US", {
style: "currency",
currency: "USD",
});

function uid(prefix = "pw") {
return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatMonthValue(date) {
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, "0");
return `${y}-${m}`;
}

function getMonthLabel(monthValue) {
const [year, month] = monthValue.split("-").map(Number);
return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
month: "long",
year: "numeric",
});
}

function parseAmount(value) {
const num = Number.parseFloat(value);
return Number.isNaN(num) ? 0 : num;
}

function isSameMonth(date, selectedMonth) {
return date?.slice(0, 7) === selectedMonth;
}

const defaultData = {
selectedMonth: formatMonthValue(new Date()),
incomes: [],
expenses: [],
savingsGoals: [],
bills: [],
};

const monthOptions = Array.from({ length: 25 }, (_, i) => {
const now = new Date();
const d = new Date(now.getFullYear(), now.getMonth() + i - 12, 1);
return {
value: formatMonthValue(d),
label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
};
});

export default function App() {
const [activeTab, setActiveTab] = useState("dashboard");
const [menuOpen, setMenuOpen] = useState(false);
const [toast, setToast] = useState("");
const [decisionInput, setDecisionInput] = useState("");
const [email, setEmail] = useState("");
const [showEmailModal, setShowEmailModal] = useState(true);

async function submitEmail(e) {
e.preventDefault();

try {
  const res = await fetch("http://localhost:3001/api/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    setEmail("");
    setShowEmailPopup(false);
    localStorage.setItem("planwiseJoined", "yes");
  } else {
    alert("Subscription failed.");
  }
} catch (err) {
  alert ("Server not running.");
}
}
const [showWelcome, setShowWelcome] = useState(() => {
try {
return localStorage.getItem(WELCOME_KEY) !== "true";
} catch {
return true;
}
});

const [showEmailPopup, setShowEmailPopup] = useState(() => {
try {
return localStorage.getItem(EMAIL_KEY) !== "true";
} catch {
return true;
}
});

const [data, setData] = useState(() => {
try {
const saved = localStorage.getItem(STORAGE_KEY);
return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
} catch {
return defaultData;
}
});

const showToast = (message) => {
setToast(message);
clearTimeout(window.__planwiseToast);
window.__planwiseToast = setTimeout(() => setToast(""), 2200);
};

const openBrevoForm = () => {
localStorage.setItem(EMAIL_KEY, "true");
setShowEmailPopup(false);
window.open(BREVO_FORM_URL, "_blank", "noopener,noreferrer");
showToast("Opening PlanWise signup");
};

useEffect(() => {
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}, [data]);

useEffect(() => {
localStorage.setItem(WELCOME_KEY, showWelcome ? "false" : "true");
}, [showWelcome]);

const selectedMonthLabel = getMonthLabel(data.selectedMonth);

const monthIncomes = useMemo(
() => data.incomes.filter((i) => isSameMonth(i.date, data.selectedMonth)),
[data.incomes, data.selectedMonth]
);

const monthExpenses = useMemo(
() => data.expenses.filter((e) => isSameMonth(e.date, data.selectedMonth)),
[data.expenses, data.selectedMonth]
);

const monthBills = useMemo(
() => data.bills.filter((b) => isSameMonth(b.dueDate, data.selectedMonth)),
[data.bills, data.selectedMonth]
);

const totalIncome = monthIncomes.reduce((s, i) => s + parseAmount(i.amount), 0);
const totalExpenses = monthExpenses.reduce((s, e) => s + parseAmount(e.amount), 0);
const remainingBalance = totalIncome - totalExpenses;
const unpaidBills = monthBills.filter((b) => !b.paid);
const unpaidBillsTotal = unpaidBills.reduce((s, b) => s + parseAmount(b.amount), 0);
const forecastBalance = remainingBalance - unpaidBillsTotal;

const savingsTotals = useMemo(() => {
const target = data.savingsGoals.reduce((s, g) => s + parseAmount(g.targetAmount), 0);
const saved = data.savingsGoals.reduce((s, g) => s + parseAmount(g.currentAmount), 0);
const percent = target > 0 ? (saved / target) * 100 : 0;
return { target, saved, percent };
}, [data.savingsGoals]);

const savingsRate = totalIncome > 0 ? (savingsTotals.saved / totalIncome) * 100 : 0;
const expenseLoad = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

const healthScore = Math.round(
Math.max(
0,
Math.min(
100,
(remainingBalance >= 0 ? 35 : 10) +
Math.max(0, 25 - Math.max(expenseLoad - 70, 0)) +
Math.min(savingsRate, 20) +
(unpaidBills.length === 0 ? 20 : 10)
)
)
);

const decisionEngine = useMemo(() => {
if (remainingBalance < 0) {
return {
title: "Stabilize Cash Flow",
reason: "Your expenses are currently higher than your income.",
action: "Reduce spending or increase income before adding new goals.",
};
}

if (forecastBalance < 0) {
return {
title: "Protect Your Month-End Balance",
reason: "Upcoming unpaid bills may put your balance below zero.",
action: "Pause extra spending until bills are covered.",
};
}

if (savingsRate < 10 && totalIncome > 0) {
return {
title: "Strengthen Savings",
reason: "Your savings rate is below a healthy level.",
action: "Move a small amount into savings this month.",
};
}

return {
title: "Build Forward Momentum",
reason: "Your financial base looks stable this month.",
action: "Keep tracking and consider saving or investing extra cash.",
};
}, [remainingBalance, forecastBalance, savingsRate, totalIncome]);

const allocationDecision = useMemo(() => {
const extra = parseAmount(decisionInput);
if (!extra) return null;

if (forecastBalance < 0) {
return {
best: "Protect Cash Flow",
reason: "Your forecast shows possible month-end pressure.",
splits: [
{ label: "Bills Buffer", amount: Math.round(extra * 0.7), tone: "orange" },
{ label: "Savings", amount: Math.round(extra * 0.3), tone: "green" },
],
};
}

if (savingsRate < 10) {
return {
best: "Build Savings First",
reason: "Your savings rate is low, so stability comes first.",
splits: [
{ label: "Savings", amount: Math.round(extra * 0.6), tone: "green" },
{ label: "Bills / Debt", amount: Math.round(extra * 0.3), tone: "orange" },
{
label: "Flex",
amount: extra - Math.round(extra * 0.6) - Math.round(extra * 0.3),
tone: "blue",
},
],
};
}

return {
best: "Balance Growth and Stability",
reason: "You have room to split extra money between savings and growth.",
splits: [
{ label: "Savings", amount: Math.round(extra * 0.4), tone: "green" },
{ label: "Invest / Growth", amount: Math.round(extra * 0.4), tone: "blue" },
{ label: "Flex", amount: extra - Math.round(extra * 0.8), tone: "orange" },
],
};
}, [decisionInput, forecastBalance, savingsRate]);

const addIncome = (payload) => {
setData((prev) => ({
...prev,
incomes: [{ id: uid("inc"), ...payload }, ...prev.incomes],
}));
};

const addExpense = (payload) => {
setData((prev) => ({
...prev,
expenses: [{ id: uid("exp"), ...payload }, ...prev.expenses],
}));
};

const addSavingsGoal = (payload) => {
setData((prev) => ({
...prev,
savingsGoals: [{ id: uid("sav"), ...payload }, ...prev.savingsGoals],
}));
};

const addBill = (payload) => {
setData((prev) => ({
...prev,
bills: [{ id: uid("bill"), ...payload }, ...prev.bills],
}));
};

const toggleBillPaid = (id) => {
setData((prev) => ({
...prev,
bills: prev.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)),
}));
showToast("Bill updated");
};

const updateGoalSaved = (id, amount) => {
const value = parseAmount(amount);
if (!value) return;

setData((prev) => ({
...prev,
savingsGoals: prev.savingsGoals.map((g) =>
g.id === id ? { ...g, currentAmount: parseAmount(g.currentAmount) + value } : g
),
}));

showToast("Savings updated");
};

const resetAllData = () => {
if (!window.confirm("Reset all PlanWise data?")) return;
setData(defaultData);
setDecisionInput("");
setMenuOpen(false);
setActiveTab("dashboard");
showToast("PlanWise reset");
};

if (showWelcome) {
return (
<div style={styles.welcomeWrap}>
<div style={styles.welcomeCard}>
<div style={styles.logoBadgeLarge}>PW</div>
<h1 style={styles.welcomeTitle}>PlanWise 2.0</h1>
<p style={styles.welcomeSubtitle}>by Dove Financial</p>
<p style={styles.welcomeText}>
Track your money, understand your position, and make smarter decisions.
</p>
<button style={styles.welcomeButton} onClick={() => setShowWelcome(false)}>
Start Planning
</button>
</div>
</div>
);
}

return (
<div style={styles.appShell}>
<div style={styles.appFrame}>
<header style={styles.header}>
<div style={styles.brandRow}>
<div style={styles.logoBadge}>PW</div>
<div>
<h1 style={styles.appTitle}>PlanWise 2.0</h1>
<p style={styles.tagline}>Rebuilt for Clarity. Simplified for Execution.</p>
</div>
</div>

<div style={styles.headerActions}>
<label style={styles.selectLabel}>
<span style={styles.selectCaption}>Selected Month</span>
<select
value={data.selectedMonth}
onChange={(e) =>
setData((prev) => ({ ...prev, selectedMonth: e.target.value }))
}
style={styles.select}
>
{monthOptions.map((m) => (
<option key={m.value} value={m.value}>
{m.label}
</option>
))}
</select>
</label>

<div style={styles.menuWrap}>
<button style={styles.menuButton} onClick={() => setMenuOpen((p) => !p)}>
PlanWise Menu
</button>

{menuOpen && (
<div style={styles.menuDropdown}>
<button
style={styles.menuItem}
onClick={() => {
setShowWelcome(true);
setMenuOpen(false);
}}
>
Show Welcome Screen
</button>
<button
style={styles.menuItem}
onClick={() => {
localStorage.removeItem(EMAIL_KEY);
setShowEmailPopup(true);
setMenuOpen(false);
}}
>
Join Email List
</button>
<button style={{ ...styles.menuItem, ...styles.menuDanger }} onClick={resetAllData}>
Reset All Data
</button>
</div>
)}
</div>
</div>
</header>

<main style={styles.contentArea}>
{activeTab === "dashboard" && (
<Dashboard
selectedMonthLabel={selectedMonthLabel}
totalIncome={totalIncome}
totalExpenses={totalExpenses}
remainingBalance={remainingBalance}
forecastBalance={forecastBalance}
savingsTotals={savingsTotals}
healthScore={healthScore}
savingsRate={savingsRate}
expenseLoad={expenseLoad}
decisionEngine={decisionEngine}
decisionInput={decisionInput}
setDecisionInput={setDecisionInput}
allocationDecision={allocationDecision}
setActiveTab={setActiveTab}
/>
)}

{activeTab === "income" && (
<IncomeTab
entries={monthIncomes}
onAdd={addIncome}
selectedMonth={data.selectedMonth}
setActiveTab={setActiveTab}
showToast={showToast}
/>
)}

{activeTab === "expenses" && (
<ExpensesTab
entries={monthExpenses}
onAdd={addExpense}
selectedMonth={data.selectedMonth}
setActiveTab={setActiveTab}
showToast={showToast}
/>
)}

{activeTab === "savings" && (
<SavingsTab
goals={data.savingsGoals}
onAdd={addSavingsGoal}
onContribute={updateGoalSaved}
setActiveTab={setActiveTab}
showToast={showToast}
/>
)}

{activeTab === "bills" && (
<BillsTab
bills={monthBills}
onAdd={addBill}
onTogglePaid={toggleBillPaid}
selectedMonth={data.selectedMonth}
setActiveTab={setActiveTab}
showToast={showToast}
/>
)}
</main>

<nav style={styles.bottomNav}>
{["dashboard", "income", "expenses", "savings", "bills"].map((tab) => (
<button
key={tab}
style={{
...styles.navButton,
...(activeTab === tab ? styles.navButtonActive : {}),
}}
onClick={() => setActiveTab(tab)}
>
{tab === "dashboard" ? "Home" : tab[0].toUpperCase() + tab.slice(1)}
</button>
))}
</nav>
</div>


{showEmailPopup && (
  <div style={styles.emailOverlay}>
    <div style={styles.emailModal}>
      <button
        type="button"
        style={styles.emailClose}
        onClick={() => setShowEmailPopup(false)}
      >
        ×
      </button>

      <div style={styles.emailBadge}>PlanWise Free</div>

      <h2 style={styles.emailTitle}>
        Get early access to smarter money tools
      </h2>

      <p style={styles.emailText}>
        Join the PlanWise list for budgeting tips, product updates, and first
        access to PlanWise Pro features like smart allocations, bank sync,
        and AI guidance.
      </p>

      <button
        type="button"
        style={styles.emailButton}
        onClick={openBrevoForm}
      >
        Join Free
      </button>

      <div style={styles.emailTrust}>
        ✔ Secure • ✔ No spam • ✔ Unsubscribe anytime
      </div>

      <button
        type="button"
        style={styles.emailSkip}
        onClick={() => setShowEmailPopup(false)}
      >
        Continue Free
      </button>
    </div>
  </div>
)}

{toast && <div style={styles.toast}>{toast}</div>}
</div>
);
}

function Dashboard({
selectedMonthLabel,
totalIncome,
totalExpenses,
remainingBalance,
forecastBalance,
savingsTotals,
healthScore,
savingsRate,
expenseLoad,
decisionEngine,
decisionInput,
setDecisionInput,
allocationDecision,
setActiveTab,
}) {
return (
<div style={styles.pageStack}>
<section style={styles.heroCard}>
<p style={styles.heroEyebrow}>Monthly Overview</p>
<h2 style={styles.heroTitle}>{selectedMonthLabel}</h2>
<p style={styles.heroText}>
PlanWise turns your income, expenses, savings, bills, and decisions into
one clear monthly plan.
</p>
</section>

<section style={styles.successBanner}>✓ You’re on track this month.</section>

<section style={styles.metricsGrid}>
<MetricCard label="Total Income" value={currency.format(totalIncome)} />
<MetricCard label="Total Expenses" value={currency.format(totalExpenses)} />
<MetricCard
label="Net Cash Flow"
value={currency.format(remainingBalance)}
negative={remainingBalance < 0}
emphasize
/>
<MetricCard
label="Cash Flow Forecast"
value={currency.format(forecastBalance)}
negative={forecastBalance < 0}
emphasize
/>
<MetricCard
label="Savings Progress"
value={`${Math.round(savingsTotals.percent)}%`}
subValue={`${currency.format(savingsTotals.saved)} of ${currency.format(
savingsTotals.target
)}`}
/>
<MetricCard label="Health Score" value={`${healthScore}/100`} emphasize />
</section>

<section style={styles.card}>
<h3 style={styles.sectionTitle}>Financial Intelligence</h3>
<div style={styles.insightsGrid}>
<InsightCard label="Savings Rate" value={`${Math.round(savingsRate)}%`} />
<InsightCard label="Expense Load" value={`${Math.round(expenseLoad)}%`} />
<InsightCard label="Health Score" value={`${healthScore}/100`} highlight />
</div>
</section>

<section style={styles.decisionCard}>
<h3 style={styles.sectionTitle}>PlanWise Decision Engine</h3>
<div style={styles.priorityCardBlue}>
<div style={styles.priorityLabel}>{decisionEngine.title}</div>
<div style={styles.priorityText}>{decisionEngine.reason}</div>
<div style={{ ...styles.priorityText, marginTop: "10px" }}>
<strong>Suggested action:</strong> {decisionEngine.action}
</div>
</div>
</section>

<section style={styles.decisionCard}>
<h3 style={styles.sectionTitle}>PlanWise Allocation Lab</h3>
<div style={styles.decisionLabStack}>
<Input
label="Extra Amount"
type="number"
value={decisionInput}
onChange={setDecisionInput}
placeholder="Example: 500"
/>

{allocationDecision ? (
<div style={styles.priorityCardBlue}>
<div style={styles.priorityLabel}>Best Move: {allocationDecision.best}</div>
<div style={styles.priorityText}>{allocationDecision.reason}</div>
<div style={styles.allocationGrid}>
{allocationDecision.splits.map((s) => (
<div key={s.label} style={allocationStyle(s.tone)}>
<div style={styles.allocationLabel}>{s.label}</div>
<div style={styles.allocationAmount}>{currency.format(s.amount)}</div>
</div>
))}
</div>
</div>
) : (
<div style={styles.emptyState}>
Enter extra money to see a smart allocation suggestion.
</div>
)}
</div>
</section>

<section style={styles.quickActionsCard}>
<h3 style={styles.sectionTitle}>Quick Actions</h3>
<div style={styles.quickActionsGrid}>
<button style={styles.actionButton} onClick={() => setActiveTab("income")}>
Add Income
</button>
<button style={styles.actionButton} onClick={() => setActiveTab("expenses")}>
Add Expense
</button>
<button style={styles.actionButton} onClick={() => setActiveTab("savings")}>
Add Savings
</button>
<button style={styles.actionButton} onClick={() => setActiveTab("bills")}>
Add Bill
</button>
</div>
</section>
</div>
);
}

function IncomeTab({ entries, onAdd, selectedMonth, setActiveTab, showToast }) {
const empty = () => ({
date: `${selectedMonth}-01`,
source: "",
category: "Job",
amount: "",
});

const [form, setForm] = useState(empty);

useEffect(() => setForm(empty()), [selectedMonth]);

const submit = (e) => {
e.preventDefault();
const amount = parseAmount(form.amount);

if (!form.date || !form.source.trim() || amount <= 0) {
showToast("Complete all income fields");
return;
}

onAdd({ ...form, source: form.source.trim(), amount });
setForm(empty());
showToast("Income added");
setTimeout(() => setActiveTab("dashboard"), 250);
};

return (
<TabLayout
formTitle="Add Income"
listTitle="Income Entries"
entries={entries}
emptyText="No income entries yet."
renderItem={(item) => (
<Row title={item.source} meta={`${item.category} • ${item.date}`} amount={item.amount} positive />
)}
>
<form onSubmit={submit} style={styles.formStack}>
<Input label="Date" type="date" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
<Input label="Income Source" value={form.source} onChange={(v) => setForm((p) => ({ ...p, source: v }))} placeholder="Paycheck, Side Hustle" />
<SelectField label="Category" value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))} options={["Job", "Business", "Side Hustle", "Other"]} />
<Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm((p) => ({ ...p, amount: v }))} placeholder="0.00" />
<button style={styles.primaryButton}>Save Income</button>
</form>
</TabLayout>
);
}

function ExpensesTab({ entries, onAdd, selectedMonth, setActiveTab, showToast }) {
const empty = () => ({
date: `${selectedMonth}-01`,
category: "Housing",
amount: "",
notes: "",
});

const [form, setForm] = useState(empty);

useEffect(() => setForm(empty()), [selectedMonth]);

const submit = (e) => {
e.preventDefault();
const amount = parseAmount(form.amount);

if (!form.date || amount <= 0) {
showToast("Complete all expense fields");
return;
}

onAdd({ ...form, amount });
setForm(empty());
showToast("Expense added");
setTimeout(() => setActiveTab("dashboard"), 250);
};

return (
<TabLayout
formTitle="Add Expense"
listTitle="Expense Entries"
entries={entries}
emptyText="No expenses yet."
renderItem={(item) => (
<Row title={item.category} meta={`${item.date}${item.notes ? ` • ${item.notes}` : ""}`} amount={item.amount} />
)}
>
<form onSubmit={submit} style={styles.formStack}>
<Input label="Date" type="date" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
<SelectField label="Category" value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))} options={["Housing", "Utilities", "Transportation", "Food", "Debt", "Business", "Other"]} />
<Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm((p) => ({ ...p, amount: v }))} placeholder="0.00" />
<Input label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Optional" />
<button style={styles.primaryButton}>Save Expense</button>
</form>
</TabLayout>
);
}

function SavingsTab({ goals, onAdd, onContribute, setActiveTab, showToast }) {
const [form, setForm] = useState({ goalName: "", targetAmount: "", currentAmount: "" });
const [contributions, setContributions] = useState({});

const submit = (e) => {
e.preventDefault();

const targetAmount = parseAmount(form.targetAmount);
const currentAmount = parseAmount(form.currentAmount);

if (!form.goalName.trim() || targetAmount <= 0) {
showToast("Complete savings goal");
return;
}

onAdd({ goalName: form.goalName.trim(), targetAmount, currentAmount });
setForm({ goalName: "", targetAmount: "", currentAmount: "" });
showToast("Savings goal added");
setTimeout(() => setActiveTab("dashboard"), 250);
};

return (
<div style={styles.tabGrid}>
<section style={styles.card}>
<h3 style={styles.sectionTitle}>Create Savings Goal</h3>
<form onSubmit={submit} style={styles.formStack}>
<Input label="Goal Name" value={form.goalName} onChange={(v) => setForm((p) => ({ ...p, goalName: v }))} />
<Input label="Target Amount" type="number" value={form.targetAmount} onChange={(v) => setForm((p) => ({ ...p, targetAmount: v }))} />
<Input label="Current Saved" type="number" value={form.currentAmount} onChange={(v) => setForm((p) => ({ ...p, currentAmount: v }))} />
<button style={styles.primaryButton}>Save Goal</button>
</form>
</section>

<section style={styles.card}>
<h3 style={styles.sectionTitle}>Savings Goals</h3>
{goals.length === 0 ? (
<div style={styles.emptyState}>No savings goals yet.</div>
) : (
<div style={styles.listStack}>
{goals.map((g) => {
const progress = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
return (
<div key={g.id} style={styles.listRow}>
<div style={styles.listTitle}>{g.goalName}</div>
<div style={styles.listMeta}>
{currency.format(g.currentAmount)} of {currency.format(g.targetAmount)}
</div>
<div style={styles.progressTrack}>
<div style={{ ...styles.progressFill, width: `${progress}%` }} />
</div>
<div style={styles.goalActions}>
<input
style={styles.inlineInput}
type="number"
placeholder="Add amount"
value={contributions[g.id] || ""}
onChange={(e) => setContributions((p) => ({ ...p, [g.id]: e.target.value }))}
/>
<button
style={styles.secondaryButton}
onClick={() => {
onContribute(g.id, contributions[g.id]);
setContributions((p) => ({ ...p, [g.id]: "" }));
}}
>
Add
</button>
</div>
</div>
);
})}
</div>
)}
</section>
</div>
);
}

function BillsTab({ bills, onAdd, onTogglePaid, selectedMonth, setActiveTab, showToast }) {
const empty = () => ({ billName: "", amount: "", dueDate: `${selectedMonth}-01` });
const [form, setForm] = useState(empty);

useEffect(() => setForm(empty()), [selectedMonth]);

const submit = (e) => {
e.preventDefault();
const amount = parseAmount(form.amount);

if (!form.billName.trim() || amount <= 0 || !form.dueDate) {
showToast("Complete bill fields");
return;
}

onAdd({ billName: form.billName.trim(), amount, dueDate: form.dueDate, paid: false });
setForm(empty());
showToast("Bill added");
setTimeout(() => setActiveTab("dashboard"), 250);
};

return (
<div style={styles.tabGrid}>
<section style={styles.card}>
<h3 style={styles.sectionTitle}>Add Bill</h3>
<form onSubmit={submit} style={styles.formStack}>
<Input label="Bill Name" value={form.billName} onChange={(v) => setForm((p) => ({ ...p, billName: v }))} />
<Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm((p) => ({ ...p, amount: v }))} />
<Input label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm((p) => ({ ...p, dueDate: v }))} />
<button style={styles.primaryButton}>Save Bill</button>
</form>
</section>

<section style={styles.card}>
<h3 style={styles.sectionTitle}>Bills</h3>
{bills.length === 0 ? (
<div style={styles.emptyState}>No bills yet.</div>
) : (
<div style={styles.listStack}>
{bills.map((b) => (
<div key={b.id} style={styles.listRow}>
<div style={styles.listRowInner}>
<div>
<div style={styles.listTitle}>{b.billName}</div>
<div style={styles.listMeta}>{b.dueDate} • {b.paid ? "Paid" : "Unpaid"}</div>
</div>
<div style={styles.billActions}>
<div style={styles.billAmount}>{currency.format(b.amount)}</div>
<button style={b.paid ? styles.paidButton : styles.toggleButton} onClick={() => onTogglePaid(b.id)}>
{b.paid ? "Paid" : "Mark Paid"}
</button>
</div>
</div>
</div>
))}
</div>
)}
</section>
</div>
);
}

function TabLayout({ formTitle, listTitle, entries, emptyText, renderItem, children }) {
return (
<div style={styles.tabGrid}>
<section style={styles.card}>
<h3 style={styles.sectionTitle}>{formTitle}</h3>
{children}
</section>
<section style={styles.card}>
<h3 style={styles.sectionTitle}>{listTitle}</h3>
{entries.length === 0 ? (
<div style={styles.emptyState}>{emptyText}</div>
) : (
<div style={styles.listStack}>
{entries.map((item) => (
<div key={item.id} style={styles.listRow}>
{renderItem(item)}
</div>
))}
</div>
)}
</section>
</div>
);
}

function Row({ title, meta, amount, positive = false }) {
return (
<div style={styles.listRowInner}>
<div>
<div style={styles.listTitle}>{title}</div>
<div style={styles.listMeta}>{meta}</div>
</div>
<div style={positive ? styles.amountPositive : styles.amountNegative}>
{currency.format(amount)}
</div>
</div>
);
}

function MetricCard({ label, value, subValue, emphasize, negative }) {
return (
<div style={{ ...styles.metricCard, ...(emphasize ? styles.metricCardEmphasis : {}) }}>
<div style={styles.metricLabel}>{label}</div>
<div style={{ ...styles.metricValue, ...(negative ? styles.metricNegative : {}) }}>
{value}
</div>
{subValue && <div style={styles.metricSubValue}>{subValue}</div>}
</div>
);
}

function InsightCard({ label, value, highlight }) {
return (
<div style={styles.insightCard}>
<div style={styles.insightLabel}>{label}</div>
<div style={{ ...styles.insightValue, ...(highlight ? styles.insightValueHighlight : {}) }}>
{value}
</div>
</div>
);
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
return (
<label style={styles.fieldWrap}>
<span style={styles.fieldLabel}>{label}</span>
<input
type={type}
value={value}
placeholder={placeholder}
onChange={(e) => onChange(e.target.value)}
style={styles.input}
/>
</label>
);
}

function SelectField({ label, value, onChange, options }) {
return (
<label style={styles.fieldWrap}>
<span style={styles.fieldLabel}>{label}</span>
<select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
{options.map((o) => (
<option key={o} value={o}>
{o}
</option>
))}
</select>
</label>
);
}

function allocationStyle(tone) {
const base = { ...styles.allocationCard };

if (tone === "green") return { ...base, background: "#f0fdf4", borderColor: "#bbf7d0" };
if (tone === "orange") return { ...base, background: "#fff7ed", borderColor: "#fed7aa" };
return { ...base, background: "#eff6ff", borderColor: "#bfdbfe" };
}

const styles = {
appShell: {
minHeight: "100vh",
background:
"radial-gradient(circle at top left, #eff6ff 0, #f8fafc 32%, #ffffff 100%)",
padding: "20px",
color: "#0f172a",
fontFamily:
'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
},
appFrame: {
maxWidth: "1200px",
margin: "0 auto",
display: "flex",
flexDirection: "column",
gap: "20px",
},
header: {
background: "rgba(255,255,255,0.94)",
border: "1px solid #dbeafe",
borderRadius: "28px",
padding: "22px",
display: "flex",
justifyContent: "space-between",
gap: "16px",
flexWrap: "wrap",
boxShadow: "0 18px 45px rgba(37, 99, 235, 0.10)",
},
brandRow: { display: "flex", alignItems: "center", gap: "14px" },
logoBadge: {
width: "52px",
height: "52px",
borderRadius: "16px",
background: "linear-gradient(135deg, #0f172a, #2563eb)",
color: "#fff",
display: "grid",
placeItems: "center",
fontWeight: 900,
},
logoBadgeLarge: {
width: "72px",
height: "72px",
borderRadius: "22px",
background: "linear-gradient(135deg, #0f172a, #2563eb)",
color: "#fff",
display: "grid",
placeItems: "center",
fontWeight: 900,
margin: "0 auto",
},
appTitle: { margin: 0, fontSize: "1.85rem", lineHeight: 1.1 },
tagline: { margin: "4px 0 0", color: "#475569" },
headerActions: { display: "flex", gap: "12px", alignItems: "end", flexWrap: "wrap" },
selectLabel: { display: "flex", flexDirection: "column", gap: "6px" },
selectCaption: { fontSize: "0.85rem", color: "#475569", fontWeight: 800 },
select: {
minWidth: "220px",
height: "44px",
borderRadius: "14px",
border: "1px solid #cbd5e1",
padding: "0 12px",
background: "#fff",
color: "#0f172a",
},
menuWrap: { position: "relative", width: "fit-content", maxWidth: "100%" },
menuButton: {
height: "44px",
borderRadius: "14px",
border: "1px solid #cbd5e1",
background: "#fff",
color: "#0f172a",
fontWeight: 800,
cursor: "pointer",
padding: "0 14px",
},
menuDropdown: {
position: "absolute",
top: "52px",
left: 0,
width: "220px",
maxWidth: "calc(100vw - 32px)",
background: "#fff",
border: "1px solid #e2e8f0",
borderRadius: "16px",
boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
overflow: "hidden",
zIndex: 10,
},
menuItem: {
width: "100%",
textAlign: "left",
padding: "12px 14px",
border: "none",
borderBottom: "1px solid #f1f5f9",
background: "#fff",
color: "#0f172a",
fontWeight: 700,
cursor: "pointer",
},
menuDanger: { color: "#b91c1c" },
contentArea: { minHeight: "60vh" },
pageStack: { display: "flex", flexDirection: "column", gap: "18px" },
heroCard: {
background: "linear-gradient(135deg, #ffffff, #eff6ff)",
border: "1px solid #bfdbfe",
borderRadius: "24px",
padding: "24px",
boxShadow: "0 10px 30px rgba(37, 99, 235, 0.08)",
},
heroEyebrow: {
margin: 0,
fontWeight: 900,
color: "#2563eb",
textTransform: "uppercase",
letterSpacing: "0.08em",
fontSize: "0.8rem",
},
heroTitle: { margin: "8px 0 6px", fontSize: "2rem" },
heroText: { margin: 0, color: "#475569", maxWidth: "700px" },
successBanner: {
background: "#f0fdf4",
border: "1px solid #bbf7d0",
color: "#166534",
borderRadius: "18px",
padding: "16px",
fontWeight: 900,
},
metricsGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
gap: "14px",
},
metricCard: {
background: "rgba(255,255,255,0.96)",
borderRadius: "24px",
border: "1px solid #e2e8f0",
padding: "22px",
boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
},
metricCardEmphasis: {
borderColor: "#bfdbfe",
background: "linear-gradient(135deg, #ffffff, #eff6ff)",
},
metricLabel: { color: "#475569", fontWeight: 800 },
metricValue: { fontSize: "1.8rem", fontWeight: 900, marginTop: "10px" },
metricNegative: { color: "#b91c1c" },
metricSubValue: { marginTop: "8px", color: "#64748b" },
card: {
background: "rgba(255,255,255,0.96)",
border: "1px solid #e2e8f0",
borderRadius: "26px",
padding: "22px",
boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
},
decisionCard: {
background: "linear-gradient(135deg, rgba(255,255,255,0.98), #eff6ff)",
border: "1px solid #bfdbfe",
borderRadius: "28px",
padding: "22px",
boxShadow: "0 18px 42px rgba(37, 99, 235, 0.12)",
},
sectionTitle: { margin: "0 0 14px", fontSize: "1.15rem" },
insightsGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
gap: "12px",
},
insightCard: {
background: "#fcfdff",
border: "1px solid #e2e8f0",
borderRadius: "18px",
padding: "16px",
},
insightLabel: { color: "#64748b", fontWeight: 900, fontSize: "0.85rem" },
insightValue: { marginTop: "8px", fontSize: "1.45rem", fontWeight: 900 },
insightValueHighlight: { color: "#2563eb" },
priorityCardBlue: {
marginTop: "8px",
padding: "20px",
borderRadius: "16px",
background: "#fff",
border: "1px solid #bfdbfe",
},
priorityLabel: { fontSize: "1.2rem", fontWeight: 900, marginBottom: "8px" },
priorityText: { color: "#475569", lineHeight: 1.6 },
decisionLabStack: { display: "flex", flexDirection: "column", gap: "12px" },
allocationGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
gap: "12px",
marginTop: "16px",
},
allocationCard: {
border: "1px solid #e2e8f0",
borderRadius: "16px",
padding: "14px",
},
allocationLabel: { color: "#64748b", fontWeight: 900, marginBottom: "8px" },
allocationAmount: { fontSize: "1.2rem", fontWeight: 900 },
quickActionsCard: {
background: "#fff",
border: "1px solid #e2e8f0",
borderRadius: "24px",
padding: "20px",
},
quickActionsGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
gap: "12px",
},
actionButton: {
height: "48px",
borderRadius: "16px",
border: "1px solid #bfdbfe",
background: "#eff6ff",
color: "#2563eb",
fontWeight: 900,
cursor: "pointer",
},
tabGrid: {
display: "grid",
gridTemplateColumns: "minmax(300px, 360px) 1fr",
gap: "18px",
alignItems: "start",
},
formStack: { display: "flex", flexDirection: "column", gap: "12px" },
fieldWrap: { display: "flex", flexDirection: "column", gap: "6px" },
fieldLabel: { fontWeight: 800, color: "#334155" },
input: {
height: "46px",
borderRadius: "16px",
border: "1px solid #cbd5e1",
padding: "0 13px",
background: "#fff",
color: "#0f172a",
},
primaryButton: {
height: "48px",
borderRadius: "16px",
border: "none",
background: "linear-gradient(135deg, #0f172a, #2563eb)",
color: "#fff",
fontWeight: 900,
cursor: "pointer",
},
secondaryButton: {
height: "42px",
borderRadius: "14px",
border: "1px solid #bfdbfe",
background: "#eff6ff",
color: "#2563eb",
fontWeight: 900,
cursor: "pointer",
padding: "0 14px",
},
listStack: { display: "flex", flexDirection: "column", gap: "10px" },
listRow: {
border: "1px solid #e2e8f0",
borderRadius: "18px",
padding: "14px",
background: "#fcfdff",
},
listRowInner: {
display: "flex",
justifyContent: "space-between",
gap: "12px",
alignItems: "center",
},
listTitle: { fontWeight: 900 },
listMeta: { color: "#64748b", fontSize: "0.9rem", marginTop: "4px" },
amountPositive: { color: "#166534", fontWeight: 900 },
amountNegative: { color: "#b91c1c", fontWeight: 900 },
emptyState: {
padding: "18px",
borderRadius: "16px",
background: "#f8fafc",
color: "#64748b",
textAlign: "center",
},
bottomNav: {
position: "sticky",
bottom: 0,
background: "rgba(255,255,255,0.96)",
border: "1px solid #dbeafe",
borderRadius: "24px",
padding: "10px",
display: "grid",
gridTemplateColumns: "repeat(5, 1fr)",
gap: "8px",
boxShadow: "0 18px 42px rgba(15, 23, 42, 0.12)",
overflowX: "auto",
},
navButton: {
border: "none",
background: "transparent",
padding: "12px 10px",
borderRadius: "14px",
fontWeight: 900,
color: "#475569",
cursor: "pointer",
whiteSpace: "nowrap",
},
navButtonActive: {
background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
color: "#2563eb",
boxShadow: "inset 0 0 0 1px #bfdbfe",
},
progressTrack: {
height: "10px",
background: "#e2e8f0",
borderRadius: "999px",
overflow: "hidden",
margin: "12px 0",
},
progressFill: {
height: "100%",
background: "linear-gradient(90deg, #2563eb, #16a34a)",
},
goalActions: { display: "flex", gap: "10px" },
inlineInput: {
flex: 1,
height: "40px",
borderRadius: "12px",
border: "1px solid #cbd5e1",
padding: "0 12px",
},
billActions: {
display: "flex",
gap: "10px",
alignItems: "center",
justifyContent: "end",
flexWrap: "wrap",
},
billAmount: { fontWeight: 900 },
toggleButton: {
height: "38px",
borderRadius: "12px",
border: "1px solid #bfdbfe",
background: "#eff6ff",
color: "#2563eb",
fontWeight: 800,
padding: "0 12px",
cursor: "pointer",
},
paidButton: {
height: "38px",
borderRadius: "12px",
border: "1px solid #bbf7d0",
background: "#f0fdf4",
color: "#166534",
fontWeight: 800,
padding: "0 12px",
cursor: "pointer",
},
toast: {
position: "fixed",
bottom: "88px",
left: "50%",
transform: "translateX(-50%)",
background: "#0f172a",
color: "#fff",
padding: "12px 20px",
borderRadius: "12px",
fontWeight: 900,
zIndex: 999,
},
welcomeWrap: {
minHeight: "100vh",
background: "linear-gradient(135deg, #f8fafc, #e0f2fe)",
display: "flex",
alignItems: "center",
justifyContent: "center",
padding: "24px",
},
welcomeCard: {
width: "100%",
maxWidth: "560px",
background: "#fff",
border: "1px solid #dbeafe",
borderRadius: "28px",
padding: "40px 28px",
textAlign: "center",
boxShadow: "0 20px 50px rgba(37, 99, 235, 0.1)",
},
welcomeTitle: { margin: "16px 0 6px", fontSize: "2.4rem", fontWeight: 900 },
welcomeSubtitle: { margin: 0, color: "#2563eb", fontWeight: 900 },
welcomeText: { margin: "18px auto 24px", color: "#475569", lineHeight: 1.6 },
welcomeButton: {
height: "50px",
minWidth: "180px",
borderRadius: "16px",
border: "none",
background: "linear-gradient(135deg, #0f172a, #2563eb)",
color: "#fff",
fontWeight: 900,
cursor: "pointer",
},   

emailOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.55)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
},

emailModal: {
  background: "#ffffff",
  border: "1px solid #dbeafe",
  width: "100%",
  maxWidth: "470px",
  borderRadius: "24px",
  padding: "28px",
  position: "relative",
  boxShadow: "0 24px 70px rgba(15,23,42,0.18)",
},

emailClose: {
  position: "absolute",
  top: "14px",
  right: "14px",
  border: "none",
  background: "transparent",
  fontSize: "22px",
  cursor: "pointer",
  color: "#64748b",
},

emailBadge: {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: "800",
  color: "#2563eb",
  background: "#eff6ff",
  padding: "6px 10px",
  borderRadius: "999px",
  marginBottom: "14px",
},

emailTitle: {
  fontSize: "32px",
  fontWeight: "900",
  lineHeight: "1.05",
  color: "#0f172a",
  marginBottom: "14px",
},

emailText: {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#475569",
  marginBottom: "18px",
},

emailInput: {
  width: "100%",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #dbeafe",
  fontSize: "15px",
  marginBottom: "12px",
  outline: "none",
},

emailButton: {
  width: "100%",
  border: "none",
  borderRadius: "14px",
  padding: "14px",
  fontWeight: "800",
  fontSize: "16px",
  color: "#fff",
  cursor: "pointer",
  background: "linear-gradient(135deg,#0f172a,#2563eb)",
},

emailTrust: {
  marginTop: "14px",
  fontSize: "12px",
  color: "#64748b",
  textAlign: "center",
},

emailSkip: {
  marginTop: "14px",
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#64748b",
  fontWeight: "800",
  cursor: "pointer",
},
};