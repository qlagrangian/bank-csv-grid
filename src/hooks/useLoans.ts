import useSWR from "swr";
import { LoanRow } from "@/types/loan";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLoans() {
  const { data, error, mutate } = useSWR<LoanRow[]>("/api/loans", fetcher);

  const deleteLoan = async (id: string) => {
    const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    mutate();
  };

  return {
    loans: data ?? [],
    isLoading: !error && !data,
    error,
    refresh: mutate,
    deleteLoan,
  };
}
