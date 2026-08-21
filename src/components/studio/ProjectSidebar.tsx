"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectSummary } from "@/lib/types";

/**
 * Projects rail on the left of the studio, as specified: create, rename,
 * duplicate, open, and send to trash.
 *
 * Mutations update local state optimistically and roll back if the request
 * fails, so renaming a project does not blank the list while a round trip
 * completes.
 */
export default function ProjectSidebar({
  projects,
  activeId,
  onSelect,
  onProjectsChange,
  onActiveChange,
  onRefresh,
}: {
  projects: ProjectSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onProjectsChange: (projects: ProjectSummary[]) => void;
  onActiveChange: (id: string) => void;
  onRefresh: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createProject() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create project");

      onProjectsChange([
        {
          id: body.project.id,
          name: body.project.name,
          createdAt: body.project.createdAt,
          updatedAt: body.project.updatedAt,
          trashedAt: null,
          generationCount: 0,
        },
        ...projects,
      ]);
      onActiveChange(body.project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  }

  async function commitRename(id: string) {
    const name = draftName.trim();
    setRenamingId(null);
    if (!name) return;

    const previous = projects;
    onProjectsChange(projects.map((p) => (p.id === id ? { ...p, name } : p)));

    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);

    if (!res?.ok) {
      onProjectsChange(previous);
      setError("Could not rename that project");
    }
  }

  async function duplicate(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not duplicate");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate");
    } finally {
      setBusy(false);
    }
  }

  async function sendToTrash(id: string) {
    const previous = projects;
    const remaining = projects.filter((p) => p.id !== id);

    // Never leave the studio with nothing selected.
    if (!remaining.length) {
      setError("Keep at least one project. Create another first.");
      return;
    }

    onProjectsChange(remaining);
    if (id === activeId) onActiveChange(remaining[0]!.id);

    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    }).catch(() => null);

    if (!res?.ok) {
      onProjectsChange(previous);
      setError("Could not move that project to trash");
    }
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-3 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-chrome-dim text-xs font-bold tracking-[0.2em] font-label uppercase">
          Projects
        </h2>
        <button
          type="button"
          onClick={createProject}
          disabled={busy}
          className="btn-ghost rounded px-2 py-1 text-xs font-semibold"
        >
          + New
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-crimson-300 text-xs">
          {error}
        </p>
      ) : null}

      <ul className="flex-1 space-y-2 overflow-y-auto">
        {projects.map((project) => {
          const selected = project.id === activeId;
          return (
            <li key={project.id}>
              <div
                data-selected={selected}
                className="hud hud-interactive group p-3"
              >
                {renamingId === project.id ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => commitRename(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(project.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    aria-label="Project name"
                    className="field w-full rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(project.id)}
                    aria-current={selected ? "true" : undefined}
                    className="w-full text-left"
                  >
                    <span
                      className={`block truncate text-sm font-semibold ${
                        selected ? "text-crimson-300" : "text-chrome"
                      }`}
                    >
                      {project.name}
                    </span>
                    <span className="text-chrome-faint text-xs">
                      {project.generationCount}{" "}
                      {project.generationCount === 1 ? "result" : "results"}
                    </span>
                  </button>
                )}

                <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <IconAction
                    label={`Rename ${project.name}`}
                    onClick={() => {
                      setRenamingId(project.id);
                      setDraftName(project.name);
                    }}
                  >
                    Rename
                  </IconAction>
                  <IconAction
                    label={`Duplicate ${project.name}`}
                    onClick={() => duplicate(project.id)}
                  >
                    Copy
                  </IconAction>
                  <IconAction
                    label={`Move ${project.name} to trash`}
                    onClick={() => sendToTrash(project.id)}
                  >
                    Trash
                  </IconAction>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href="/projects?view=trash"
        className="text-chrome-faint hover:text-chrome-dim text-xs transition-colors"
      >
        View trash →
      </Link>
    </aside>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-chrome-faint hover:text-crimson-300 rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors"
    >
      {children}
    </button>
  );
}
