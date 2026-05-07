import React from "react";
import ReactDOM from "react-dom/client";
import { Wand2, FileDown, Columns3, RefreshCcw, Sparkles, CheckCircle2 } from "lucide-react";
import type { LayoutDocument, PageFrame, TextFrame } from "@opendtp/dtp-core";
import { sampleLayout } from "@opendtp/dtp-core";
import "./styles.css";

const defaultPrompt =
  "Create an A4 editorial brief title: Local Food Futures with 3 columns, bleed, a lead image, and a serious magazine tone.";

function App() {
  const [layout, setLayout] = React.useState<LayoutDocument>(sampleLayout);
  const [prompt, setPrompt] = React.useState(defaultPrompt);
  const [instruction, setInstruction] = React.useState("Make body copy 3 columns and add bleed");
  const [busy, setBusy] = React.useState(false);
  const [provider, setProvider] = React.useState("sample");

  async function generateLayout() {
    setBusy(true);
    try {
      const response = await fetch("/api/layouts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = (await response.json()) as { layout: LayoutDocument; provider: string };
      setLayout(data.layout);
      setProvider(data.provider);
    } finally {
      setBusy(false);
    }
  }

  async function applyInstruction() {
    setBusy(true);
    try {
      const response = await fetch("/api/layouts/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, instruction })
      });
      const data = (await response.json()) as { layout: LayoutDocument; provider: string };
      setLayout(data.layout);
      setProvider(data.provider);
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    setBusy(true);
    try {
      await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout })
      });
      setProvider("pdf-export-queued");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="studio-shell">
      <aside className="tool-panel" aria-label="Document controls">
        <div className="brand-lockup">
          <span className="brand-mark">OD</span>
          <div>
            <h1>OpenDTP Studio</h1>
            <p>Prompt-to-layout desktop publishing</p>
          </div>
        </div>

        <section className="control-group">
          <label htmlFor="prompt">Layout prompt</label>
          <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <button type="button" onClick={generateLayout} disabled={busy}>
            <Wand2 size={16} /> Generate layout
          </button>
        </section>

        <section className="control-group">
          <label htmlFor="instruction">Design command</label>
          <input id="instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
          <button type="button" className="secondary" onClick={applyInstruction} disabled={busy}>
            <Sparkles size={16} /> Apply command
          </button>
        </section>

        <section className="spec-grid" aria-label="Document specs">
          <Spec label="Page" value={layout.pageSize.name} />
          <Spec label="Size" value={`${layout.pageSize.widthMm} x ${layout.pageSize.heightMm} mm`} />
          <Spec label="Bleed" value={`${layout.pageSize.bleedMm} mm`} />
          <Spec label="Color" value={layout.colorMode} />
        </section>

        <section className="preflight">
          <div className="preflight-title">
            <CheckCircle2 size={16} />
            <span>Preflight</span>
          </div>
          {layout.preflight.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>

        <button type="button" className="export" onClick={exportPdf} disabled={busy}>
          <FileDown size={16} /> Queue PDF export
        </button>
        <p className="provider">Provider: {provider}</p>
      </aside>

      <section className="workspace" aria-label="Document preview">
        <header className="workspace-bar">
          <div>
            <p className="eyebrow">Live page preview</p>
            <h2>{layout.title}</h2>
          </div>
          <div className="workspace-actions">
            <span title="Dynamic column flow">
              <Columns3 size={18} />
            </span>
            <button type="button" title="Reset sample" onClick={() => setLayout(sampleLayout)}>
              <RefreshCcw size={16} />
            </button>
          </div>
        </header>
        <DocumentPreview layout={layout} />
      </section>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DocumentPreview({ layout }: { layout: LayoutDocument }) {
  const scale = 2.35;
  return (
    <div className="pasteboard">
      {layout.pages.map((page) => (
        <article
          className="page"
          key={page.id}
          style={{
            width: `${layout.pageSize.widthMm * scale}px`,
            height: `${layout.pageSize.heightMm * scale}px`,
            padding: `${layout.pageSize.bleedMm * scale}px`
          }}
        >
          <div className="trim-box">
            {page.frames.map((frame) => (
              <FrameView key={frame.id} frame={frame} layout={layout} scale={scale} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function FrameView({ frame, layout, scale }: { frame: PageFrame; layout: LayoutDocument; scale: number }) {
  const style: React.CSSProperties = {
    left: `${frame.xMm * scale}px`,
    top: `${frame.yMm * scale}px`,
    width: `${frame.widthMm * scale}px`,
    height: `${frame.heightMm * scale}px`
  };

  if (frame.type === "image") {
    return (
      <div className="frame image-frame" style={style} aria-label={frame.alt}>
        <span>{frame.alt}</span>
      </div>
    );
  }

  return <TextFrameView frame={frame} layout={layout} style={style} />;
}

function TextFrameView({ frame, layout, style }: { frame: TextFrame; layout: LayoutDocument; style: React.CSSProperties }) {
  const story = layout.stories.find((candidate) => candidate.id === frame.storyId);
  const content = frame.role === "headline" ? story?.title : story?.content;
  return (
    <div
      className={`frame text-frame ${frame.role}`}
      style={{
        ...style,
        columnCount: frame.columns,
        columnGap: `${frame.columnGapMm}mm`,
        fontFamily: layout.typography.fontFamily
      }}
    >
      {content}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
