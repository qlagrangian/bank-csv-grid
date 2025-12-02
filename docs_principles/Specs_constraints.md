# Specs Constraints: Tagging and PDF Linkage

- タグ編集禁止は **Deactivate行のみ**。リンク生成された子行（ID末尾が `-NNN` 連番のもの）は編集可能とする。
- Deactivate判定は、子行のIDから連番サフィックス（`-NNN`）を剥がして親IDを復元し、一致する行だけをDeactivate扱いにする。汎用的なハイフンを含むID（例: cuid/uuid）の行をDeactivate扱いしてはならない。
- UIのタグ編集可否ロジックは `row.isDeactivated === true` のみを禁止条件に用いる（子行や通常行は常に編集可）。
- リンク子行/孫行のID付与は `親ID-001` 形式で3桁連番とし、再紐付け時は同一親プレフィックスの子行を置換する。
