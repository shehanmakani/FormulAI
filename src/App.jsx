import { useEffect, useMemo, useState } from "react";

const HISTORY_KEY = "formulai-history-v2";

const defaultResult = {
  formulation_name: "",
  ingredients: [],
  trade_offs: [],
  regulatory_flags: [],
  disclaimer: "",
};

const priorities = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const sampleBriefs = [
  "Silicone-free hair conditioner for textured hair with rich slip, low buildup, and a naturally derived story.",
  "Low-VOC industrial degreaser for heavy equipment with high flash point, strong grease lift, and moderate foam.",
  "Biobased concrete release agent with easy demold, low staining, and good storage stability in cold climates.",
];

function clampNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTone(score) {
  if (score >= 75) return "from-emerald-500/20 to-emerald-500/5 text-emerald-200";
  if (score >= 50) return "from-amber-500/20 to-amber-500/5 text-amber-100";
  return "from-rose-500/20 to-rose-500/5 text-rose-100";
}

function percentRange(ingredient) {
  return `${ingredient.weight_percent_min} - ${ingredient.weight_percent_max}%`;
}

function App() {
  const [description, setDescription] = useState("");
  const [sustainabilityPriority, setSustainabilityPriority] = useState(72);
  const [costSensitivity, setCostSensitivity] = useState("medium");
  const [region, setRegion] = useState("Global");
  const [result, setResult] = useState(defaultResult);
  const [status, setStatus] = useState("idle");
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(HISTORY_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch {
      window.localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const canSubmit = description.trim().length > 10;
  const showingResult =
    Boolean(result.formulation_name) ||
    result.ingredients.length > 0 ||
    result.trade_offs.length > 0 ||
    result.regulatory_flags.length > 0;

  const activeHistory = useMemo(() => history.slice(0, 4), [history]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setError("");
    setStreamText("");
    setResult(defaultResult);

    try {
      const response = await fetch("/api/formulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          sustainabilityPriority,
          costSensitivity,
          region,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        setStatus("error");
        setError(payload.error ?? "Unable to generate a formulation right now.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event: "));
          const dataLine = lines.find((line) => line.startsWith("data: "));

          if (!eventLine || !dataLine) continue;

          const eventName = eventLine.replace("event: ", "").trim();
          const payload = JSON.parse(dataLine.replace("data: ", ""));

          if (eventName === "delta") {
            setStreamText((current) => current + (payload.text ?? ""));
          }

          if (eventName === "partial" && payload.data) {
            setResult((current) => ({
              ...current,
              ...payload.data,
              ingredients: payload.data.ingredients ?? current.ingredients,
              trade_offs: payload.data.trade_offs ?? current.trade_offs,
              regulatory_flags:
                payload.data.regulatory_flags ?? current.regulatory_flags,
            }));
          }

          if (eventName === "complete") {
            completed = true;
            setResult(payload.data);
            setStatus("done");
            setHistory((current) =>
              [
                {
                  savedAt: new Date().toISOString(),
                  prompt: description,
                  parameters: {
                    sustainabilityPriority,
                    costSensitivity,
                    region,
                  },
                  result: payload.data,
                },
                ...current,
              ].slice(0, 10),
            );
          }

          if (eventName === "error") {
            setStatus("error");
            setError(payload.error ?? "Generation failed.");
          }
        }
      }

      if (!completed) {
        setStatus((current) => (current === "error" ? current : "done"));
      }
    } catch (requestError) {
      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The request failed unexpectedly.",
      );
    }
  }

  function loadHistoryItem(item) {
    setDescription(item.prompt);
    setSustainabilityPriority(item.parameters.sustainabilityPriority);
    setCostSensitivity(item.parameters.costSensitivity);
    setRegion(item.parameters.region);
    setResult(item.result);
    setStatus("done");
    setStreamText("");
    setError("");
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.18),transparent_22%),radial-gradient(circle_at_15%_20%,rgba(148,163,184,0.12),transparent_20%),linear-gradient(180deg,#07111f_0%,#081728_42%,#040b14_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:96px_96px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-2xl shadow-black/25 backdrop-blur xl:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-amber-400/30 bg-[linear-gradient(145deg,rgba(217,119,6,0.25),rgba(15,23,42,0.2))] text-lg font-semibold text-amber-100 shadow-lg shadow-amber-950/20">
                F
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-amber-300/80">
                  ChemeNova IntelliForm
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-[0.02em] text-white">
                  FormulAI
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  Formulation intelligence, accelerated.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">
                  Workspace
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  Materials intelligence cockpit
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">
                  Inference
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  Groq API for fast, low-cost streaming
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">
                  Export
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  One-click print view for PDF cards
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="no-print rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,31,0.92),rgba(7,12,22,0.88))] p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-amber-300/80">
                  Brief Builder
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  Design a concept worth testing
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
                {status === "loading" ? "Streaming" : "Ready"}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              Explore elegant starting formulas for specialty chemical programs,
              with a more refined control surface for formulation intent, cost
              posture, and regulatory scope.
            </p>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Target Product
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={8}
                  placeholder="Describe performance goals, sensory targets, processing constraints, sustainability objectives, and any ingredient exclusions."
                  className="min-h-[190px] w-full rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-amber-400/10"
                />
              </label>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Sample Briefs
                  </span>
                  <span className="text-xs text-slate-500">Tap to load</span>
                </div>
                <div className="grid gap-3">
                  {sampleBriefs.map((brief) => (
                    <button
                      key={brief}
                      type="button"
                      onClick={() => setDescription(brief)}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-sm leading-6 text-slate-300 transition hover:border-amber-400/40 hover:bg-amber-400/[0.06] hover:text-white"
                    >
                      {brief}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Sustainability priority
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Push toward bio-based, lower-impact, and cleaner profile choices.
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm font-semibold text-amber-100">
                    {sustainabilityPriority}
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={sustainabilityPriority}
                  onChange={(event) =>
                    setSustainabilityPriority(clampNumber(event.target.value))
                  }
                  className="luxury-range mt-5 w-full"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Cost Sensitivity
                  </span>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {priorities.map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setCostSensitivity(priority.value)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                          costSensitivity === priority.value
                            ? "border-amber-400/60 bg-amber-400/15 text-amber-100"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Regulatory Region
                  </span>
                  <select
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0d1827] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10"
                  >
                    <option>US</option>
                    <option>EU</option>
                    <option>Global</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit || status === "loading"}
                className="group flex w-full items-center justify-between rounded-[28px] border border-amber-400/30 bg-[linear-gradient(135deg,#d97706,#b45309_50%,#7c2d12)] px-5 py-4 text-left text-sm font-semibold text-white shadow-xl shadow-amber-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>
                  {status === "loading"
                    ? "Generating formulation intelligence..."
                    : "Generate formulation"}
                </span>
                <span className="text-[11px] uppercase tracking-[0.3em] text-amber-50/80">
                  Launch
                </span>
              </button>
            </form>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Recent Sessions
                </p>
                <p className="text-xs text-slate-500">{history.length} saved</p>
              </div>
              <div className="mt-4 space-y-3">
                {activeHistory.length > 0 ? (
                  activeHistory.map((item) => (
                    <button
                      key={`${item.savedAt}-${item.result.formulation_name}`}
                      type="button"
                      onClick={() => loadHistoryItem(item)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0c1523] px-4 py-4 text-left transition hover:border-amber-400/40 hover:bg-[#101b2d]"
                    >
                      <p className="text-sm font-medium text-white">
                        {item.result.formulation_name}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {item.prompt}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                    Your saved formulation history will appear here after the first run.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="print-card rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_320px]">
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6">
                <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-amber-300/80">
                      Formulation Chamber
                    </p>
                    <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {result.formulation_name || "Awaiting concept generation"}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                      {showingResult
                        ? "A premium first-pass concept, organized for technical review, team discussion, and printable handoff."
                        : "Submit a brief to reveal the ingredient architecture, performance posture, and regulatory watch-outs."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      disabled={!showingResult}
                      className="no-print rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:border-amber-400/50 hover:bg-amber-400/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Export Card
                    </button>
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-300">
                      Region: <span className="font-medium text-white">{region}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-[#08111d] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                      Ingredients
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {result.ingredients.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#08111d] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                      Trade-offs
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {result.trade_offs.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#08111d] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                      Flags
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {result.regulatory_flags.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#08111d] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                      Sustainability
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {sustainabilityPriority}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                {status === "loading" && (
                  <div className="mt-5 rounded-[26px] border border-amber-400/20 bg-[linear-gradient(180deg,rgba(217,119,6,0.12),rgba(8,17,29,0.4))] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Groq stream is composing the formulation card
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-amber-200/70">
                          Live JSON monitor
                        </p>
                      </div>
                      <div className="h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.9)]" />
                    </div>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="stream-bar h-full w-1/2 rounded-full bg-[linear-gradient(90deg,#fbbf24,#d97706,#f59e0b)]" />
                    </div>
                    <pre className="mt-4 max-h-52 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#07111b] p-4 text-xs leading-6 text-slate-400">
                      {streamText || "Waiting for structured response..."}
                    </pre>
                  </div>
                )}
              </div>

              <aside className="no-print rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
                <p className="text-[11px] uppercase tracking-[0.38em] text-amber-300/75">
                  Program Lens
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#08111d] p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Brief Quality
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {Math.min(99, Math.max(24, description.trim().length))}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Richer targets and constraints usually produce more defensible first-pass formulas.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#08111d] p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Design Posture
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Balanced for <span className="font-medium text-white">{costSensitivity}</span> cost sensitivity with a{" "}
                      <span className="font-medium text-white">{region}</span> regulatory lens and a sustainability priority of{" "}
                      <span className="font-medium text-white">{sustainabilityPriority}/100</span>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#08111d] p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Submission Note
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-400">
                      Powered by ChemeNova IntelliForm™ technology, designed for premium internal demos and showcase submissions.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <div className="rounded-[30px] border border-white/10 bg-[#08111d]/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.38em] text-slate-500">
                      Composition Architecture
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Ingredient table
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                    {result.ingredients.length} line items
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
                      <tr>
                        <th className="pb-2 pr-4">Ingredient</th>
                        <th className="pb-2 pr-4">Function</th>
                        <th className="pb-2 pr-4">Window</th>
                        <th className="pb-2 pr-4">CAS</th>
                        <th className="pb-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.ingredients.length > 0 ? (
                        result.ingredients.map((ingredient) => (
                          <tr key={`${ingredient.name}-${ingredient.cas_number}`}>
                            <td className="rounded-l-2xl border-y border-l border-white/10 bg-white/[0.03] px-4 py-4 font-medium text-white">
                              {ingredient.name}
                            </td>
                            <td className="border-y border-white/10 bg-white/[0.03] px-4 py-4 text-slate-300">
                              {ingredient.function}
                            </td>
                            <td className="border-y border-white/10 bg-white/[0.03] px-4 py-4 text-amber-100">
                              {percentRange(ingredient)}
                            </td>
                            <td className="border-y border-white/10 bg-white/[0.03] px-4 py-4 text-slate-400">
                              {ingredient.cas_number || "Not supplied"}
                            </td>
                            <td className="rounded-r-2xl border-y border-r border-white/10 bg-white/[0.03] px-4 py-4 text-slate-300">
                              {ingredient.notes}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="rounded-[24px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500"
                          >
                            Ingredient architecture will appear here once a formulation is generated.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[30px] border border-white/10 bg-[#08111d]/90 p-5">
                  <p className="text-[11px] uppercase tracking-[0.38em] text-slate-500">
                    Trade-Off Atlas
                  </p>
                  <div className="mt-5 grid gap-3">
                    {result.trade_offs.length > 0 ? (
                      result.trade_offs.map((tradeOff) => (
                        <div
                          key={tradeOff.dimension}
                          className={`rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">
                              {tradeOff.dimension}
                            </p>
                            <span
                              className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold ${scoreTone(
                                tradeOff.score,
                              )}`}
                            >
                              {tradeOff.score}/100
                            </span>
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]"
                              style={{ width: `${Math.max(6, tradeOff.score)}%` }}
                            />
                          </div>
                          <p className="mt-4 text-sm leading-6 text-slate-300">
                            {tradeOff.note}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
                        Performance, cost, and sustainability tension points will populate here.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[30px] border border-white/10 bg-[#08111d]/90 p-5">
                  <p className="text-[11px] uppercase tracking-[0.38em] text-slate-500">
                    Regulatory Watch
                  </p>
                  <div className="mt-5 space-y-3">
                    {result.regulatory_flags.length > 0 ? (
                      result.regulatory_flags.map((flag, index) => (
                        <div
                          key={`${flag.substance}-${flag.jurisdiction}-${index}`}
                          className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-amber-100">
                              {flag.jurisdiction}
                            </span>
                            <p className="text-sm font-semibold text-white">
                              {flag.substance}
                            </p>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            {flag.flag}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
                        Jurisdiction notes and caution flags will appear here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[30px] border border-white/10 bg-[#08111d]/90 p-5">
              <p className="text-[11px] uppercase tracking-[0.38em] text-slate-500">
                Technical Disclaimer
              </p>
              <p className="mt-4 max-w-5xl text-sm leading-7 text-slate-300">
                {result.disclaimer ||
                  "Generated concepts are intended for expert screening only and should be validated with bench testing, SDS review, supplier verification, and jurisdiction-specific compliance assessment before use."}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
