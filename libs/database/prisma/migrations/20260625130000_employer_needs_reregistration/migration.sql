-- Mijozni qayta ro'yxatdan o'tkazish uchun belgi
ALTER TABLE "Employer" ADD COLUMN "needsReregistration" BOOLEAN NOT NULL DEFAULT false;
