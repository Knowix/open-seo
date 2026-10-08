import { useQuery } from "@tanstack/react-query";
import { getTregUsage } from "@/serverFunctions/treg";
import { Button } from "@/client/components/ui/button";

export function TregUsageSettings({ projectId }: { projectId: string }) {
  const usage = useQuery({
    queryKey: ["treg-usage", projectId],
    queryFn: () => getTregUsage({ data: { projectId } }),
  });
  if (!usage.data && !usage.isError) return null;
  if (usage.data?.provider !== "treg" && !usage.isError) return null;
  return (
    <section className="space-y-3 rounded-lg border p-5">
      <h2 className="text-lg font-semibold">Treg usage</h2>
      <p className="text-sm text-muted-foreground">
        Actual USD charges reported by Treg for this project's requests since
        usage recording was installed. Google account reads are free. OpenSEO
        credit estimates are not your Treg balance.
      </p>
      {usage.isError ? (
        <p>Couldn't load usage. Retry to read the saved ledger.</p>
      ) : (
        <>
          <p>
            <strong>
              $
              {(
                Number(usage.data?.totals?.knownCostMicro ?? 0) / 1_000_000
              ).toFixed(6)}
            </strong>{" "}
            recorded charges · {usage.data?.totals?.requests ?? 0} requests ·{" "}
            {usage.data?.totals?.unknownCosts ?? 0} missing charge headers
          </p>
          <p className="text-sm text-muted-foreground">
            Missing headers mean unknown spend, not zero. This excludes calls
            made outside this app and earlier calls. Idempotent replays count
            once.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Endpoint</th>
                  <th>HTTP</th>
                  <th>USD</th>
                </tr>
              </thead>
              <tbody>
                {usage.data?.calls.map((call) => (
                  <tr key={call.id} className="border-t">
                    <td className="py-2">
                      {new Date(call.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2">{call.endpoint}</td>
                    <td>{call.status === 0 ? "No response" : call.status}</td>
                    <td>
                      {call.costMicro === null
                        ? "Unknown"
                        : (call.costMicro / 1_000_000).toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        Supported: mapped live SEO routes and local GA4/Search Console reads.
        Scheduled rank checks use live SERPs. Other queued tasks and unmapped
        routes are rejected before submission. AI answer audits continue through
        the existing Treg research workflow.
      </p>
      <Button variant="outline" size="sm" onClick={() => void usage.refetch()}>
        Refresh usage
      </Button>
    </section>
  );
}
