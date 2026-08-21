"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectSummary } from "@/lib/types";

/**
 * Project management outside the studio, including the trash view.
 *
 * Restore and trash are reversible so they act immediately; permanent delete is
 * not, so it asks first.
 */
export default function ProjectTable({
  projects: initial,
  showTrash,
}: {
  projects: ProjectSummary[];
  showTrash: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    const previous = projects;
    setProjects(projects.filter((p) => p.id !== id));
    setError(null);

    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (!res?.ok) {
      setProjects(previous);
      setError("That did not work. Try again.");
    }
  }

  async function destroy(id: string) {
    const previous = projects;
    setProjects(projects.filter((p) => p.id !== id));
    setConfirmingId(null);
    setError(null);

    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(
      () => null,
    );

    if (!res?.ok) {
      setProjects(previous);
      setError("Could not delete that project.");
    }
  }

  async function duplicate(id: string) {
    setError(null);
    const res = await fetch(`/api/projects/${id}/duplicate`, {
      method: "POST",
    }).catch(() => null);
    if (!res?.ok) {
      setError("Could not duplicate that project.");
      return;
    }
    router.refresh();
  }

  if (!projects.length) {
    return (
      <p className="hud text-chrome-dim p-8 text-center text-sm">
        {showTrash ? "Nothing in the trash." : "No projects yet."}
      </p>
    );
  }

  return (
    <>
      {error ? (
        <p role="alert" className="text-crimson-300 mb-3 text-sm">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {projects.map((project) => (
          <li
            key={project.id}
            className="hud flex flex-wrap items-center gap-4 p-4"
          >
            <div className="min-w-0 flex-1">
              {showTrash ? (
                <span className="text-chrome block truncate font-semibold">
                  {project.name}
                </span>
              ) : (
                <Link
                  href={`/studio?project=${project.id}`}
                  className="text-chrome hover:text-crimson-300 block truncate font-semibold transition-colors"
                >
                  {project.name}
                </Link>
              )}
              <span className="text-chrome-faint text-xs">
                {project.generationCount}{" "}
                {project.generationCount === 1 ? "result" : "results"} · updated{" "}
                {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {showTrash ? (
                <>
                  <button
                    type="button"
                    onClick={() => patch(project.id, { trashed: false })}
                    className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
                  >
                    Restore
                  </button>

                  {confirmingId === project.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-crimson-300 text-xs">
                        Delete for good?
                      </span>
                      <button
                        type="button"
                        onClick={() => destroy(project.id)}
                        className="btn-primary rounded px-3 py-1.5 text-xs font-semibold"
                      >
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="text-chrome-faint hover:text-chrome text-xs font-semibold"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(project.id)}
                      className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href={`/studio?project=${project.id}`}
                    className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicate(project.id)}
                    className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(project.id, { trashed: true })}
                    className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
                  >
                    Trash
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
