import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { exportPdf } from "./exportPdf";
import "./App.css";

const TYPE_LABELS = {
  article: "Articles",
  podcast: "Podcasts",
  seminar: "Seminars",
};
const TYPE_ORDER = ["article", "podcast", "seminar"];

function isNew(dateAdded) {
  const added = new Date(dateAdded);
  const now = new Date();
  const days = (now - added) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function App() {
  const [content, setContent] = useState([]);
  const [member, setMember] = useState(null);
  const [completed, setCompleted] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const memberSlug = params.get("member");

  useEffect(() => {
    async function load() {
      try {
        const contentRes = await fetch("/content.json");
        const contentData = await contentRes.json();
        setContent(contentData);

        if (!memberSlug) {
          setLoading(false);
          return;
        }

        const { data: memberData, error: memberErr } = await supabase
          .from("members")
          .select("*")
          .eq("slug", memberSlug)
          .single();

        if (memberErr || !memberData) {
          setError("not_found");
          setLoading(false);
          return;
        }
        setMember(memberData);

        const { data: completionsData } = await supabase
          .from("completions")
          .select("*")
          .eq("member_slug", memberSlug);

        const map = {};
        for (const row of completionsData || []) {
          map[row.content_id] = row.completed_date;
        }
        setCompleted(map);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("load_failed");
        setLoading(false);
      }
    }
    load();
  }, [memberSlug]);

  async function toggle(contentId) {
    if (completed[contentId]) {
      await supabase
        .from("completions")
        .delete()
        .eq("member_slug", memberSlug)
        .eq("content_id", contentId);

      setCompleted((prev) => {
        const next = { ...prev };
        delete next[contentId];
        return next;
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("completions").insert({
        member_slug: memberSlug,
        content_id: contentId,
        completed_date: today,
      });

      setCompleted((prev) => ({ ...prev, [contentId]: today }));
    }
  }

  if (loading)
    return (
      <div className="app">
        <p className="muted">Loading…</p>
      </div>
    );

  if (!memberSlug) {
    return (
      <div className="app">
        <header className="header">
          <h1>The Athenaeum</h1>
          <p className="subtitle">Continuing Education Tracker</p>
        </header>
        <div className="card">
          <p>No member specified. Your unique link should look like:</p>
          <p className="muted">
            <code>?member=your-name</code>
          </p>
        </div>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="app">
        <header className="header">
          <h1>The Athenaeum</h1>
          <p className="subtitle">Continuing Education Tracker</p>
        </header>
        <div className="card">
          <p>
            Member "<strong>{memberSlug}</strong>" not found.
          </p>
          <p className="muted">Please check your link or contact Katie.</p>
        </div>
      </div>
    );
  }

  if (error === "load_failed") {
    return (
      <div className="app">
        <header className="header">
          <h1>The Athenaeum</h1>
          <p className="subtitle">Continuing Education Tracker</p>
        </header>
        <div className="card">
          <p>Something went wrong loading data. Please try refreshing.</p>
        </div>
      </div>
    );
  }

  const grouped = {};
  for (const type of TYPE_ORDER) grouped[type] = [];
  for (const item of content) {
    if (grouped[item.type]) grouped[item.type].push(item);
  }
  for (const type of TYPE_ORDER) {
    grouped[type].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }

  const totalHours = content
    .filter((c) => completed[c.id])
    .reduce((sum, c) => sum + (c.ceHours || 0), 0);

  const completedCount = Object.keys(completed).length;

  return (
    <div className="app">
      <header className="header">
        <h1>The Athenaeum</h1>
        <p className="subtitle">Continuing Education Tracker</p>
      </header>

      <section className="member-bar">
        <div>
          <div className="muted small">Member</div>
          <div className="member-name">{member.full_name}</div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat">
            <div className="stat-value">{totalHours}</div>
            <div className="stat-label">CE Hours</div>
          </div>
          <button
            className="btn"
            onClick={() => exportPdf(member, content, completed)}
          >
            Export PDF
          </button>
        </div>
      </section>

      {TYPE_ORDER.map((type) => {
        const items = grouped[type];
        if (!items.length) return null;
        return (
          <section key={type} className="group">
            <h2>{TYPE_LABELS[type]}</h2>
            <ul className="list">
              {items.map((item) => {
                const isChecked = Boolean(completed[item.id]);
                return (
                  <li
                    key={item.id}
                    className={`item ${isChecked ? "checked" : ""}`}
                  >
                    <label className="item-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                      />
                      <div className="item-body">
                        <div className="item-title-row">
                          <span className="item-title">{item.title}</span>
                          {isNew(item.dateAdded) && (
                            <span className="badge-new">New</span>
                          )}
                        </div>
                        <div className="item-meta">
                          {formatDate(item.dateAdded)} · {item.ceHours} CE{" "}
                          {item.ceHours === 1 ? "hour" : "hours"}
                          {isChecked &&
                            ` · completed ${formatDate(completed[item.id])}`}
                        </div>
                        <div className="item-desc">{item.description}</div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <footer className="footer">
        <p>The Athenaeum · Hello Joy OT LLC</p>
      </footer>
    </div>
  );
}
