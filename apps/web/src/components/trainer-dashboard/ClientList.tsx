import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ClientRow, type ClientRowProps } from "@/components/trainer-dashboard/ClientRow";

type ClientTableLabels = {
  name: ReactNode;
  lastActivity: ReactNode;
  plan: ReactNode;
  status: ReactNode;
};

type ClientListProps = {
  title?: ReactNode;
  clients: ClientRowProps[];
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  loadingContent?: ReactNode;
  errorContent?: ReactNode;
  emptyContent?: ReactNode;
  mode?: "list" | "table";
  tableLabels?: ClientTableLabels;
  className?: string;
};

export function ClientList({
  title,
  clients,
  loading = false,
  error = false,
  empty = false,
  loadingContent,
  errorContent,
  emptyContent,
  mode = "list",
  tableLabels,
  className,
}: ClientListProps) {
  return (
    <Card className={className}>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>
        {loading ? loadingContent : null}
        {!loading && error ? errorContent : null}
        {!loading && !error && (empty || clients.length === 0) ? emptyContent : null}

        {!loading && !error && !empty && clients.length > 0 ? (
          mode === "table" ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem" }}>{tableLabels?.name ?? null}</th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem" }}>{tableLabels?.lastActivity ?? null}</th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem" }}>{tableLabels?.plan ?? null}</th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem" }}>{tableLabels?.status ?? null}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, index) => (
                    <tr key={index} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>{client.name}</td>
                      <td style={{ padding: "0.875rem 1rem" }}>{client.lastActivity}</td>
                      <td style={{ padding: "0.875rem 1rem" }}>{client.planBadge?.label ?? null}</td>
                      <td style={{ padding: "0.875rem 1rem" }}>{client.statusBadge?.label ?? null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0 }}>
              {clients.map((client, index) => (
                <ClientRow key={index} {...client} />
              ))}
            </ul>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

export type { ClientListProps, ClientTableLabels };
