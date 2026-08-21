import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IdleWatcher from "@/components/IdleWatcher";
import ProjectTable from "@/components/ProjectTable";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ProjectSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Projects",
  description: "Every project you have made, plus the trash.",
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: PageProps<"/projects">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const showTrash = params.view === "trash";

  const rows = await db.project.findMany({
    where: {
      userId: user.id,
      trashedAt: showTrash ? { not: null } : null,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      trashedAt: true,
      _count: { select: { generations: true } },
    },
  });

  const projects: ProjectSummary[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    trashedAt: p.trashedAt?.toISOString() ?? null,
    generationCount: p._count.generations,
  }));

  return (
    <>
      <SiteHeader />
      <IdleWatcher />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-chrome text-4xl">
              {showTrash ? "Trash" : "Projects"}
            </h1>
            <p className="text-chrome-dim mt-2 text-sm">
              {showTrash
                ? "Restore anything you still want, or delete it for good."
                : "Open, rename, duplicate or trash any project."}
            </p>
          </div>

          <a
            href={showTrash ? "/projects" : "/projects?view=trash"}
            className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold"
          >
            {showTrash ? "Back to projects" : "View trash"}
          </a>
        </header>

        <div className="mt-8">
          <ProjectTable projects={projects} showTrash={showTrash} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
