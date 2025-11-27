BEGIN;

-- 1) Tag（階層）: 親→子→孫（葉）
-- ルート: "PJ収入の部"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt")
VALUES
('8a1c2d9e-3a4b-4f1c-9b2a-1f3a9b2c4d5e','PJ収入の部',NULL,10,TRUE,now(),now());

-- 中間: "プロジェクト売り上げ"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt")
VALUES
('1f2e3d4c-5b6a-7c8d-9e0f-112233445566','プロジェクト売り上げ','8a1c2d9e-3a4b-4f1c-9b2a-1f3a9b2c4d5e',20,TRUE,now(),now());

-- 葉: "SES" / "受託開発"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt")
VALUES
('9b8a7c6d-5e4f-3a2b-1c0d-66778899aabb','SES','1f2e3d4c-5b6a-7c8d-9e0f-112233445566',30,TRUE,now(),now()),
('0aa1bb2c-3dd4-5ee6-7ff8-99aabbccdde0','受託開発','1f2e3d4c-5b6a-7c8d-9e0f-112233445566',40,TRUE,now(),now());

-- ルート: "経費の部"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt")
VALUES
('aaaa1111-bbbb-2222-cccc-3333dddd4444','経費の部',NULL,10,TRUE,now(),now());

-- 葉: "交通費" / "サブスク"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt")
VALUES
('eeee5555-ffff-6666-0000-111122223333','交通費','aaaa1111-bbbb-2222-cccc-3333dddd4444',20,TRUE,now(),now()),
('44445555-6666-7777-8888-9999aaaabbbb','サブスク','aaaa1111-bbbb-2222-cccc-3333dddd4444',30,TRUE,now(),now());

-- 2) Transaction（取引）: 収入2件・支出2件（tag列は後方互換のためNULL）
INSERT INTO "Transaction"
("id","bank","date","description","credit","debit","balance","memo","tag","createdAt")
VALUES
('clzwx0k8b0001abc123defgh','Mizuhobank','2025-06-15','入金 ACME株式会社 6月分SES',550000,0,3250000,'PJ-SES 2025/06',NULL,now()),
('clzwx0k8b0002abc123defgh','Mizuhobank','2025-06-28','受託開発 6月検収',300000,0,3550000,'PJ-受託 2025/06',NULL,now()),
('clzwx0k8b0003abc123defgh','Mizuhobank','2025-06-20','出張 交通費',0,12000,3538000,'プロジェクトA 移動',NULL,now()),
('clzwx0k8b0004abc123defgh','Mizuhobank','2025-06-25','SaaS 月額',0,5000,3533000,'Teams / Notion 等',NULL,now());

-- 3) TagAssignment（取引×葉タグの紐付け）
-- 保存は「葉のみ」、同一(取引×タグ)の重複禁止。:contentReference[oaicite:6]{index=6}
INSERT INTO "TagAssignment" ("id","transactionId","tagId","createdBy","createdAt") VALUES
('clzwx1t2p0001xyz890qwert','clzwx0k8b0001abc123defgh','9b8a7c6d-5e4f-3a2b-1c0d-66778899aabb','shuya',now()), -- SES
('clzwx1t2p0002xyz890qwert','clzwx0k8b0002abc123defgh','0aa1bb2c-3dd4-5ee6-7ff8-99aabbccdde0','shuya',now()), -- 受託開発
('clzwx1t2p0003xyz890qwert','clzwx0k8b0003abc123defgh','eeee5555-ffff-6666-0000-111122223333','shuya',now()), -- 交通費
('clzwx1t2p0004xyz890qwert','clzwx0k8b0004abc123defgh','44445555-6666-7777-8888-9999aaaabbbb','shuya',now()); -- サブスク

COMMIT;

-- ✅ 目視検証用: 直近投入データの確認
-- タグ（ツリーの葉だけ抽出）
SELECT t."id", t."name", t."parentId"
FROM "Tag" t
WHERE NOT EXISTS (SELECT 1 FROM "Tag" c WHERE c."parentId" = t."id")
ORDER BY t."parentId", t."order";

-- 取引×付与タグ
SELECT a."transactionId", tr."description", a."tagId", tg."name"
FROM "TagAssignment" a
JOIN "Transaction" tr ON tr."id" = a."transactionId"
JOIN "Tag" tg ON tg."id" = a."tagId"
ORDER BY tr."date", tr."id";
