import { useEffect, useState } from "react";

const HISTORY_KEY = "formulai-history-v1";

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

function clampNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTone(score) {
  if (score >= 75) return "text-emerald-600 bg-emerald-50";
  if (score >= 50) return "text-amber-700 bg-amber-50";
  return "text-rose-700 bg-rose-50";
}

function App() {
  const [description, setDescription] = useState("");
  const [sustainabilityPriority, setSustainabilityPriority] = useState(60);
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
              ].slice(0, 8),
            );
          }

          if (eventName === "error") {
            setStatus("error");
            setError(payload.error ?? "Generation failed.");
          }
        }
      }

      if (!completed && status !== "error") {
        setStatus("done");
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

  const showingResult =
    Boolean(result.formulation_name) ||
    result.ingredients.length > 0 ||
    result.trade_offs.length > 0 ||
    result.regulatory_flags.length > 0;

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="w-full bg-navy px-6 py-8 text-slate-100 lg:w-[340px] lg:px-8">
          <div className="sticky top-0">
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-bold">
                  F
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">FormulAI</h1>
                  <p className="text-sm text-slate-300">
                    Formulation intelligence, accelerated.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-amber-400">
                  Focus
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Specialty chemical R&amp;D teams exploring faster first-pass
                  formulation concepts with visible trade-offs and regulatory notes.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-amber-400">
                  Recent History
                </p>
                {history.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {history.slice(0, 3).map((item) => (
                      <button
                        key={`${item.savedAt}-${item.result.formulation_name}`}
                        type="button"
                        onClick={() => loadHistoryItem(item)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left transition hover:border-amber-400/40 hover:bg-slate-900"
                      >
                        <p className="text-sm font-medium text-slate-100">
                          {item.result.formulation_name}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {item.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Saved formulation history will appear here.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-slate-200">
                Export uses a clean print view so teams can turn a formulation card
                into a PDF from the browser in one click.
              </div>
            </div>

            <p className="mt-8 text-xs text-slate-500">
              Powered by ChemeNova IntelliForm™ technology
            </p>
          </div>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="no-print rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">
                Formulation Brief
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                Describe your target product
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Generate a first-pass formulation concept with ingredient ranges,
                function notes, trade-offs, and jurisdiction-aware regulatory flags.
              </p>

              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Target product
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={7}
                    placeholder="Low-VOC industrial degreaser for heavy equipment cleaning with good flash point, moderate foam, and strong grease lift."
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </label>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Sustainability priority
                      </p>
                      <p className="text-xs text-slate-500">
                        Bias toward bio-based and lower-impact options.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-800 shadow-sm">
                      {sustainabilityPriority}
                    </span>
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
                    className="mt-4 w-full accent-amber-600"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Cost sensitivity
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {priorities.map((priority) => (
                        <button
                          key={priority.value}
                          type="button"
                          onClick={() => setCostSensitivity(priority.value)}
                          className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                            costSensitivity === priority.value
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Regulatory region
                    </span>
                    <select
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
                    >
                      <option>US</option>
                      <option>EU</option>
                      <option>Global</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || status === "loading"}
                  className="w-full rounded-2xl bg-navy px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {status === "loading" ? "Generating formulation..." : "Generate formulation"}
                </button>
              </form>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-panel print-card sm:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">
                    Formulation Card
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    {result.formulation_name || "Awaiting formulation concept"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {showingResult
                      ? "Review the suggested composition window, functional rationale, trade-offs, and flagged compliance considerations before bench validation."
                      : "Submit a formulation brief to generate a structured concept for screening and internal review."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!showingResult}
                  className="no-print rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-500 hover:text-amber-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Export / Print
                </button>
              </div>

              {error && (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {status === "loading" && (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <p className="text-sm font-medium text-slate-700">
                      Streaming formulation draft...
                    </p>
                  </div>
                  <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-500">
                    {streamText || "Waiting for structured output..."}
                  </pre>
                </div>
              )}

              <div className="mt-8 grid gap-6">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Ingredient Table
                    </h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {result.ingredients.length} items
                    </span>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                      <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="pb-2 pr-4">Ingredient</th>
                          <th className="pb-2 pr-4">CAS</th>
                          <th className="pb-2 pr-4">Function</th>
                          <th className="pb-2 pr-4">Wt. %</th>
                          <th className="pb-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.ingredients.length > 0 ? (
                          result.ingredients.map((ingredient) => (
                            <tr key={`${ingredient.name}-${ingredient.cas_number}`}>
                              <td className="rounded-l-2xl bg-white px-4 py-4 font-medium text-slate-900">
                                {ingredient.name}
                              </td>
                              <td className="bg-white px-4 py-4 text-slate-600">
                                {ingredient.cas_number || "Not supplied"}
                              </td>
                              <td className="bg-white px-4 py-4 text-slate-600">
                                {ingredient.function}
                              </td>
                              <td className="bg-white px-4 py-4 text-slate-900">
                                {ingredient.weight_percent_min} - {ingredient.weight_percent_max}
                              </td>
                              <td className="rounded-r-2xl bg-white px-4 py-4 text-slate-600">
                                {ingredient.notes}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="rounded-2xl bg-white px-4 py-8 text-center text-slate-500">
                              No ingredients yet. Generate a formulation to populate the table.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Trade-off Matrix
                    </h3>
                    <div className="mt-4 grid gap-3">
                      {result.trade_offs.length > 0 ? (
                        result.trade_offs.map((tradeOff) => (
                          <div
                            key={tradeOff.dimension}
                            className="rounded-2xl bg-white p-4"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {tradeOff.dimension}
                              </p>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreTone(
                                  tradeOff.score,
                                )}`}
                              >
                                {tradeOff.score}/100
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {tradeOff.note}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                          Performance, cost, and sustainability commentary will appear here.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Regulatory Flags
                    </h3>
                    <div className="mt-4 space-y-3">
                      {result.regulatory_flags.length > 0 ? (
                        result.regulatory_flags.map((flag, index) => (
                          <div
                            key={`${flag.substance}-${flag.jurisdiction}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                {flag.jurisdiction}
                              </span>
                              <p className="text-sm font-semibold text-slate-900">
                                {flag.substance}
                              </p>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {flag.flag}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                          Region-specific flags and handling notes will appear here.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Technical Disclaimer
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {result.disclaimer ||
                      "Generated concepts are intended for expert screening only and should be verified with bench testing, SDS review, and jurisdiction-specific compliance assessment."}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
