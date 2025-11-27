// src/components/BankSelect.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BankCode } from "@/converters";

interface Props {
  value: BankCode;
  onChange(v: BankCode): void;
}

export default function BankSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as BankCode)}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="銀行を選択" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="all">すべて</SelectItem>
        <SelectItem value="paypay">PayPay</SelectItem>
        <SelectItem value="gmo">GMO あおぞら</SelectItem>
        <SelectItem value="sbi">住信SBI</SelectItem>
        <SelectItem value="mizuhoebiz">みずほ銀行ｅＢｉｚ</SelectItem>
        <SelectItem value="mizuhobizweb">みずほ BizWeb</SelectItem>
      </SelectContent>
    </Select>
  );
}
