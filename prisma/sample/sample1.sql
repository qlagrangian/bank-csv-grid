BEGIN;

-- 1) Tag（階層）: 親→子→孫（葉）
-- ルート: "PJ収入の部"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt") VALUES
('8a1c2d9e-3a4b-4f1c-9b2a-1f3a9b2c4d5e','PJ収入の部',NULL,10,TRUE,now(),now());

-- 中間: "プロジェクト売り上げ"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt") VALUES
('1f2e3d4c-5b6a-7c8d-9e0f-112233445566','プロジェクト売り上げ','8a1c2d9e-3a4b-4f1c-9b2a-1f3a9b2c4d5e',20,TRUE,now(),now());

-- 葉: "SES" / "受託開発"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt") VALUES
('9b8a7c6d-5e4f-3a2b-1c0d-66778899aabb','SES','1f2e3d4c-5b6a-7c8d-9e0f-112233445566',30,TRUE,now(),now()),
('0aa1bb2c-3dd4-5ee6-7ff8-99aabbccdde0','受託開発','1f2e3d4c-5b6a-7c8d-9e0f-112233445566',40,TRUE,now(),now());

-- ルート: "経費の部"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt") VALUES
('aaaa1111-bbbb-2222-cccc-3333dddd4444','経費の部',NULL,10,TRUE,now(),now());

-- 葉: "交通費" / "サブスク"
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt") VALUES
('eeee5555-ffff-6666-0000-111122223333','交通費','aaaa1111-bbbb-2222-cccc-3333dddd4444',20,TRUE,now(),now()),
('44445555-6666-7777-8888-9999aaaabbbb','サブスク','aaaa1111-bbbb-2222-cccc-3333dddd4444',30,TRUE,now(),now());

-- 「交通費」の子として "SES" を作る（別枝の同名葉）
-- ※ id を正しい UUID にする
INSERT INTO "Tag" ("id","name","parentId","order","active","createdAt","updatedAt") VALUES
('123e4567-e89b-12d3-a456-426614174000','SES','eeee5555-ffff-6666-0000-111122223333',20,TRUE,now(),now());

-- 2) Transaction（取引）
INSERT INTO "Transaction"
("id","bank","date","description","credit","debit","balance","memo","tag","createdAt") VALUES
('clzwx0k8b0001abc123defgh','paypay','2025-06-15','入金 ACME株式会社 6月分SES',550000,0,3250000,'PJ-SES 2025/06',NULL,now()),
('clzwx0k8b0002abc123defgh','paypay','2025-06-28','受託開発 6月検収',300000,0,3550000,'PJ-受託 2025/06',NULL,now()),
('clzwx0k8b0003abc123defgh','paypay','2025-06-20','出張 交通費',0,12000,3538000,'プロジェクトA 移動',NULL,now()),
('clzwx0k8b0004abc123defgh','paypay','2025-06-25','SaaS 月額',0,5000,3533000,'Teams / Notion 等',NULL,now());

-- 3) TagAssignment（取引×葉タグの紐付け）
INSERT INTO "TagAssignment" ("id","transactionId","tagId","createdBy","createdAt") VALUES
('clzwx1t2p0001xyz890qwert','clzwx0k8b0001abc123defgh','9b8a7c6d-5e4f-3a2b-1c0d-66778899aabb','shuya',now()), -- SES(収入)
('clzwx1t2p0002xyz890qwert','clzwx0k8b0002abc123defgh','0aa1bb2c-3dd4-5ee6-7ff8-99aabbccdde0','shuya',now()), -- 受託開発
('clzwx1t2p0004xyz890qwert','clzwx0k8b0004abc123defgh','44445555-6666-7777-8888-9999aaaabbbb','shuya',now()), -- サブスク
('clzwx1t2p0003xyz890qwert','clzwx0k8b0003abc123defgh','123e4567-e89b-12d3-a456-426614174000','shuya',now());  -- 交通費の子SES(費用)

COMMIT;

-- ✅ 目視検証

-- 葉タグだけ（子を持たないタグ）
SELECT t."id", t."name", t."parentId"
FROM "Tag" t
WHERE NOT EXISTS (SELECT 1 FROM "Tag" c WHERE c."parentId" = t."id")
ORDER BY t."name";

-- 取引 × 付与タグ（あれば表示）
SELECT tr."id" AS "transactionId",
       tr."date",
       tr."description",
       ta."tagId",
       tg."name" AS "tagName"
FROM "Transaction" tr
LEFT JOIN "TagAssignment" ta ON ta."transactionId" = tr."id"
LEFT JOIN "Tag" tg ON tg."id" = ta."tagId"
ORDER BY tr."date", tr."id";
