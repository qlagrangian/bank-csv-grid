# /api/report 整合性チェック手順

## 前提
- 開発サーバーを起動しておく: `npm run dev`
- `jq` が利用可能であること

## コマンド例

月配列と期首残高・融資データの整合性を確認する:
```bash
curl -s http://localhost:3000/api/report \
  | jq '{
      months,
      openingLen: (.openingBalances|to_entries|map({bank:.key, len:(.value|length)})),
      loans: .loans
    }'
```

### 期待結果例
```
{
  "months": [
    "2024-01",
    "2024-02",
    "2024-03",
    "2024-04",
    "2024-05",
    "2024-06",
    "2024-07"
  ],
  "openingLen": [
    { "bank": "gmo", "len": 7 }
  ],
  "loans": {
    "gmo": {
      "2024年春季融資": {
        "amount": 12000000,
        "startIndex": 4
      }
    }
  }
}
```

### 確認ポイント
- `months` の長さと `openingBalances[bank]` の長さが一致していること（上記例: 7）。
- 融資データの `startIndex` が `months` 配列のインデックスと整合すること（例: `"2024-05"` が months[4] の場合、startIndex=4）。
- `startIndex = -1` の融資が無いか（発生月が範囲外の場合は -1 になる）。
