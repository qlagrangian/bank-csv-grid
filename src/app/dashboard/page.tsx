"use client";

import { LoanForm } from "@/components/LoanForm";
import { LoanPanel } from "@/components/LoanPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">融資管理ダッシュボード</h1>

      <Card>
        <CardHeader>
          <CardTitle>新規融資登録</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanForm onSuccess={() => window.location.reload()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>融資一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanPanel />
        </CardContent>
      </Card>
    </div>
  );
}
