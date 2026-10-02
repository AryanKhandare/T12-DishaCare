import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEMO_USERS } from "@/lib/seed";
import { ROLE_LABEL } from "@/lib/auth-store";
import { useSim } from "@/lib/sim-store";
import { getAdminUsers } from "@/lib/api";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — BedLink" },
      { name: "description", content: "Registered user accounts from the BedLink database." },
      { property: "og:title", content: "Users — BedLink" },
      { property: "og:description", content: "Registered user accounts from the BedLink database." },
    ],
  }),
  component: UsersPage,
});

interface UserRow {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: string;
  hospital_id?: string | null;
  hospitalId?: string | null;
  ambulance_id?: string | null;
  is_active?: boolean;
  created_at?: string;
}

function UsersPage() {
  const hospitals = useSim((s) => s.hospitals);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"db" | "demo">("demo");

  useEffect(() => {
    let mounted = true;
    getAdminUsers()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setUsers(data);
          setSource("db");
        } else if (mounted) {
          setUsers(DEMO_USERS as any);
          setSource("demo");
        }
      })
      .catch(() => {
        if (mounted) {
          setUsers(DEMO_USERS as any);
          setSource("demo");
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const roleLabel = (role: string) => {
    const upper = (role || "").toUpperCase();
    if (upper === "HOSPITAL" || upper === "HOSPITAL_NURSE") return ROLE_LABEL["hospital"] || "Nurse";
    if (upper === "DISPATCHER") return ROLE_LABEL["dispatcher"] || "Dispatcher";
    if (upper === "ADMIN") return ROLE_LABEL["admin"] || "Admin";
    return role;
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          {source === "db"
            ? `${users.length} registered accounts from BedLink database`
            : "Seeded demo accounts · password demo123"}
        </p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading users…</span>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assignment</TableHead>
                {source === "db" && <TableHead>Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const hId = u.hospital_id || u.hospitalId;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                        {roleLabel(u.role)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {hId ? hospitals.find((h) => h.id === hId)?.name ?? hId : u.ambulance_id ?? "All areas"}
                    </TableCell>
                    {source === "db" && (
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.is_active !== false ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {u.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
