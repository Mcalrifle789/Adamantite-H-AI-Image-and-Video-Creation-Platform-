import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IdleWatcher from "@/components/IdleWatcher";
import { activeSessionWhere, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { planFor } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Owner console",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Owner console.
 *
 * The spec restricts the account list to the owner, so a non-owner gets a 404
 * rather than a 403: there is no reason to confirm the page exists to someone
 * who cannot use it.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") notFound();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      plan: true,
      subscriptionStatus: true,
      createdAt: true,
      periodStart: true,
      _count: { select: { projects: true, generations: true } },
      // An account is "active" when it has at least one live session.
      sessions: {
        where: activeSessionWhere(),
        select: { lastSeenAt: true },
        orderBy: { lastSeenAt: "desc" },
        take: 1,
      },
    },
  });

  // Spend for the current window, in one grouped query rather than per user.
  const spendRows = await db.usageEntry.groupBy({
    by: ["userId"],
    _sum: { delta: true },
  });
  const spendByUser = new Map(
    spendRows.map((r) => [r.userId, -(r._sum.delta ?? 0)]),
  );

  const activeCount = users.filter((u) => u.sessions.length > 0).length;

  return (
    <>
      <SiteHeader />
      <IdleWatcher />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-chrome text-4xl">Owner console</h1>
            <p className="text-chrome-dim mt-2 text-sm">
              {users.length} {users.length === 1 ? "account" : "accounts"} ·{" "}
              {activeCount} active now
            </p>
          </div>
        </header>

        <div className="hud mt-8 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <caption className="sr-only">
              All registered accounts, their plan and whether they are currently
              active
            </caption>
            <thead>
              <tr className="text-chrome-faint border-edge/70 border-b text-xs tracking-wider font-label uppercase">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Active
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Account
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Plan
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Projects
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Generations
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Credits used
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => {
                const active = account.sessions.length > 0;
                const lastSeen = account.sessions[0]?.lastSeenAt;

                return (
                  <tr
                    key={account.id}
                    className="border-edge/40 border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      {/*
                        A colour alone would not communicate state to anyone who
                        cannot distinguish it, so the dot is paired with text
                        that is visible to screen readers.
                      */}
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            active
                              ? "bg-signal-green shadow-[0_0_8px_var(--color-signal-green)]"
                              : "bg-edge"
                          }`}
                        />
                        <span className="sr-only">
                          {active ? "Active" : "Not active"}
                        </span>
                        {active && lastSeen ? (
                          <span className="text-chrome-faint text-xs">
                            {new Date(lastSeen).toLocaleTimeString()}
                          </span>
                        ) : null}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-chrome block font-semibold">
                        {account.displayName}
                        {account.role === "OWNER" ? (
                          <span className="bg-crimson-900 text-crimson-300 ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider font-label uppercase">
                            Owner
                          </span>
                        ) : null}
                      </span>
                      <span className="text-chrome-faint text-xs">
                        {account.email}
                      </span>
                    </td>

                    <td className="text-chrome px-4 py-3 font-semibold">
                      {planFor(account.plan).name}
                    </td>

                    <td className="text-chrome-dim px-4 py-3">
                      {account.subscriptionStatus === "NONE"
                        ? "—"
                        : account.subscriptionStatus
                            .toLowerCase()
                            .replace("_", " ")}
                    </td>

                    <td className="text-chrome-dim px-4 py-3 text-right">
                      {account._count.projects}
                    </td>
                    <td className="text-chrome-dim px-4 py-3 text-right">
                      {account._count.generations}
                    </td>
                    <td className="text-chrome-dim px-4 py-3 text-right">
                      {(spendByUser.get(account.id) ?? 0).toLocaleString()}
                    </td>
                    <td className="text-chrome-faint px-4 py-3 text-xs">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
