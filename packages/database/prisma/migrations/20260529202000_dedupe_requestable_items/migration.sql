WITH duplicate_groups AS (
  SELECT
    lower("nameEn") AS normalized_name,
    MIN("id") AS keep_id
  FROM "ItemCatalog"
  WHERE "kind" = 'request'
  GROUP BY lower("nameEn")
  HAVING COUNT(*) > 1
),
duplicate_items AS (
  SELECT item."id", groups.keep_id
  FROM "ItemCatalog" item
  JOIN duplicate_groups groups ON groups.normalized_name = lower(item."nameEn")
  WHERE item."kind" = 'request'
    AND item."id" <> groups.keep_id
)
UPDATE "ItemRequest" request
SET "itemCatalogId" = duplicate_items.keep_id
FROM duplicate_items
WHERE request."itemCatalogId" = duplicate_items."id";

WITH duplicate_groups AS (
  SELECT
    lower("nameEn") AS normalized_name,
    MIN("id") AS keep_id
  FROM "ItemCatalog"
  WHERE "kind" = 'request'
  GROUP BY lower("nameEn")
  HAVING COUNT(*) > 1
),
duplicate_items AS (
  SELECT item."id", groups.keep_id
  FROM "ItemCatalog" item
  JOIN duplicate_groups groups ON groups.normalized_name = lower(item."nameEn")
  WHERE item."kind" = 'request'
    AND item."id" <> groups.keep_id
)
UPDATE "DropHistory" drop_history
SET "itemCatalogId" = duplicate_items.keep_id
FROM duplicate_items
WHERE drop_history."itemCatalogId" = duplicate_items."id";

WITH duplicate_groups AS (
  SELECT
    lower("nameEn") AS normalized_name,
    MIN("id") AS keep_id
  FROM "ItemCatalog"
  WHERE "kind" = 'request'
  GROUP BY lower("nameEn")
  HAVING COUNT(*) > 1
),
duplicate_items AS (
  SELECT item."id"
  FROM "ItemCatalog" item
  JOIN duplicate_groups groups ON groups.normalized_name = lower(item."nameEn")
  WHERE item."kind" = 'request'
    AND item."id" <> groups.keep_id
)
DELETE FROM "ItemCatalog"
WHERE "id" IN (SELECT "id" FROM duplicate_items);

CREATE UNIQUE INDEX "ItemCatalog_request_nameEn_unique"
ON "ItemCatalog"(lower("nameEn"))
WHERE "kind" = 'request';
