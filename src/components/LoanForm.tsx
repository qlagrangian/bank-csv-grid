"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BankSelect from "@/components/BankSelect";
import { BankCode } from "@/converters";

export function LoanForm({ onSuccess }: { onSuccess: () => void }) {
  const [bank, setBank] = useState<BankCode>("gmo");
  const [batchName, setBatchName] = useState("");
  const [amount, setAmount] = useState("");
  const [occurrenceYM, setOccurrenceYM] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank,
          batchName,
          amount: parseFloat(amount),
          occurrenceYM,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
        return;
      }

      // フォームリセット
      setBatchName("");
      setAmount("");
      setOccurrenceYM("");
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">銀行</label>
        <BankSelect value={bank} onChange={setBank} />
      </div>
      <div>
        <label className="block text-sm font-medium">融資バッチ名</label>
        <Input
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="例: 2024年春季融資"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">融資額</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000000"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">発生年月</label>
        <Input
          type="month"
          value={occurrenceYM}
          onChange={(e) => setOccurrenceYM(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "登録中…" : "融資登録"}
      </Button>
    </form>
  );
}
