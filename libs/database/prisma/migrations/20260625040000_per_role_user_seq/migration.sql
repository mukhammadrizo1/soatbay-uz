-- Mijoz (employer) va ishchi (worker) uchun ALOHIDA ko'rsatiladigan raqamlash.
-- Avval global `seq` (bitta umumiy ketma-ketlik) ishlatilardi; endi har bir rol
-- o'z ketma-ketligiga ega va INSERT da trigger orqali to'ldiriladi.

-- 1) Eski global unique indeks va autoincrement default ni olib tashlash
DROP INDEX IF EXISTS "User_seq_key";
ALTER TABLE "User" ALTER COLUMN "seq" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "User_seq_seq";
ALTER TABLE "User" ALTER COLUMN "seq" DROP NOT NULL;

-- 2) Mavjud foydalanuvchilarni rol bo'yicha qaytadan raqamlash (1 dan)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY role ORDER BY "createdAt", id) AS rn
  FROM "User"
)
UPDATE "User" u SET "seq" = r.rn FROM ranked r WHERE u.id = r.id;

-- 3) Rol bo'yicha ketma-ketliklar (joriy maksimaldan keyin davom etadi)
CREATE SEQUENCE IF NOT EXISTS user_employer_seq;
CREATE SEQUENCE IF NOT EXISTS user_worker_seq;
SELECT setval(
  'user_employer_seq',
  GREATEST((SELECT COALESCE(MAX("seq"), 0) FROM "User" WHERE role = 'employer'), 1),
  (SELECT COALESCE(MAX("seq"), 0) FROM "User" WHERE role = 'employer') > 0
);
SELECT setval(
  'user_worker_seq',
  GREATEST((SELECT COALESCE(MAX("seq"), 0) FROM "User" WHERE role = 'worker'), 1),
  (SELECT COALESCE(MAX("seq"), 0) FROM "User" WHERE role = 'worker') > 0
);

-- 4) INSERT da rol bo'yicha seq beradigan trigger (barcha klientlar uchun ishlaydi)
CREATE OR REPLACE FUNCTION assign_user_seq() RETURNS trigger AS $$
BEGIN
  IF NEW."seq" IS NULL THEN
    IF NEW."role" = 'worker' THEN
      NEW."seq" := nextval('user_worker_seq');
    ELSE
      NEW."seq" := nextval('user_employer_seq');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_user_seq ON "User";
CREATE TRIGGER trg_assign_user_seq
  BEFORE INSERT ON "User"
  FOR EACH ROW EXECUTE FUNCTION assign_user_seq();

-- 5) Rol + seq bo'yicha noyoblik (client #1 va worker #1 birga yashashi mumkin)
CREATE UNIQUE INDEX "User_role_seq_key" ON "User"("role", "seq");
