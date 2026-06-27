# Soatbay / Kaska Uz — Kunlik ish bozori

**Ish beruvchilar** (qisqa muddatli/kunlik ishlarni e'lon qiladiganlar) va
**ishchilar** (ularga yoziladiganlar) ni **ikkita Telegram bot** hamda **veb
admin panel** orqali bog'lovchi monorepo platforma. Hammasi yagona NestJS
backend va bitta PostgreSQL ma'lumotlar bazasidan foydalanadi.

## Ilovalar va kutubxonalar

```
soatbay-uz/
├─ apps/
│  ├─ backend/        # NestJS REST API + Telegram xabarnomalar + kanalga joylash
│  ├─ employer-bot/   # grammY Telegram bot — ish beruvchilar e'lon yaratadi va boshqaradi
│  ├─ worker-bot/     # grammY Telegram bot — ishchilar ro'yxatdan o'tadi, hisob to'ldiradi, VIP oladi, yoziladi
│  └─ admin-panel/    # Angular + Tailwind admin veb ilova (spartan.ng ga tayyor)
└─ libs/
   ├─ shared-types/   # ilovalar o'rtasida umumiy enum, DTO, interfeyslar
   ├─ common/         # o'zbekcha xabarlar katalogi, validatorlar, formatlovchilar, shablonlar
   └─ database/       # Prisma sxema, klient singleton, seed
```

## Texnologiyalar to'plami

- **Backend:** NestJS (TypeScript), JWT autentifikatsiya, class-validator
- **Botlar:** grammY, Redis-da saqlanadigan FSM sessiyalar (`@grammyjs/storage-redis`)
- **Admin:** Angular 18 (standalone) + Tailwind CSS (spartan.ng bog'liqliklari kiritilgan)
- **Ma'lumotlar bazasi:** Prisma orqali PostgreSQL
- **Kesh / FSM holati:** Redis
- **Monorepo:** npm workspaces + Nx

## Talablar

- Node.js >= 20
- Docker (Postgres + Redis uchun) — yoki o'zingizning Postgres/Redis nusxalaringiz
- Ikkita Telegram bot tokeni ([@BotFather](https://t.me/BotFather) dan) va bitta kanal

## O'rnatish

```bash
# 1. Barcha bog'liqliklarni o'rnatish (bitta root o'rnatish har bir workspace ni,
#    shu jumladan Angular admin panelini ham qamrab oladi)
npm install

# 2. Muhitni sozlash
cp env.example.template .env
#    so'ng .env ni tahrirlang: EMPLOYER_BOT_TOKEN, WORKER_BOT_TOKEN, CHANNEL_ID,
#    WORKER_BOT_USERNAME, JWT_SECRET va boshqalarni o'rnating (.env Git ga yuklanmaydi)

# 3. Postgres + Redis ni ishga tushirish
npm run docker:up

# 4. Prisma klientini generatsiya qilish, migratsiyalarni bajarish, standart qiymatlarni seed qilish
npm run db:generate     # npm install dan keyin DOIM ishga tushiring (install klientni o'chiradi)
npm run db:migrate      # sxemani yaratadi (dev)
npm run db:seed         # standart admin akkaunt + sozlamalar/karta ma'lumotlari
```

> Eslatma: `npm install` `@prisma/client` ni paket keshidan qayta chiqaradi, bu
> esa avval generatsiya qilingan klientni o'chiradi. Backend/botlarni qurish yoki
> ishga tushirishdan oldin har qanday install dan so'ng `npm run db:generate` ni
> qayta ishga tushiring.

Seed `.env` dagi `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` (standart
`admin` / `admin123`) yordamida admin akkaunt yaratadi.

## Ishga tushirish (development)

Alohida terminallar oching yoki kerakligini ishga tushiring:

```bash
npm run start:backend        # http://localhost:3000/api
npm run start:employer-bot   # long-polling Telegram bot
npm run start:worker-bot     # long-polling Telegram bot
npm run start:admin          # http://localhost:4200
```

## Asosiy biznes qoidalari (amalga oshirilgan)

- Bitta telefon raqami aniq bitta foydalanuvchiga mos keladi (`+998XXXXXXXXX`
  kanonik shakl; `+998901234567` yoki `901234567` qabul qilinadi).
- Bloklangan foydalanuvchilar har bir amalda standart o'zbekcha xabar bilan to'xtatiladi.
- Suhbat oqimlari Redis da saqlanadigan cheklangan holatli mashinalar (FSM); har
  bir qadam kiritishni tekshiradi va xatoda qayta so'raydi, **Orqaga** va **Asosiy
  menyu** tugmalari bilan.
- "Bugun" gi ishlar boshlanish vaqti hozir + 30 daqiqadan kam bo'lmasligi kerak.
- VIP 30 kun davomida bepul yozilishni beradi (xizmat haqi yo'q, kutish yo'q).
- Xizmat haqi ish obyekti ichida saqlanadi; admin uni belgilaydi yoki avtomatik
  hisoblanadi: ish haqi ≤ 150 000 → 10 000 so'm, aks holda → 20 000 so'm.
- Ishchi yozilish tekshiruvlari tartib bilan ishlaydi: sana to'qnashuvi →
  shu sanada jarayondagi → bo'sh o'rinlar → masofa skrinshoti → VIP / hisob /
  karta-chek to'lovi.
- Qayta e'lon berish in-memory nusxani tahrirlaydi va faqat qayta chiqarishda
  bazaga yoziladi.
- Karta ma'lumotlari global, admin **Sozlamalar** bo'limida sozlanadi.
- Har bir admin tasdig'i/rad etishi tegishli Telegram foydalanuvchisiga xabar beradi.

## Admin panel bo'limlari

`Dashboard`, `Mijozlar`, `Ishchilar` (detail/tahrirlash/o'chirish, hisobni
tahrirlash, VIP almashtirish bilan), `Depozitlar`, `E'lonlar` (filtr + sana
oralig'i + o'chirish), `Ishga yozilishlar` (+ e'lon yaratish), `In pending`
(4 ta tab: e'lon / hisob to'ldirish / ro'yxatdan o'tish / yozilish so'rovlari,
tasdiqlash / ogohlantirish / bloklash / bekor qilish bilan), `Sozlamalar`.

Admin panelni Telegram Web App sifatida ham joylashtirsa bo'ladi.

### spartan.ng UI komponentlarini qo'shish

Angular ilovasi Tailwind va `@spartan-ng/brain` bilan oldindan ulangan. Helm UI
primitivlarini qo'shish uchun `apps/admin-panel` ichida spartan generatorlarini
ishga tushiring:

```bash
cd apps/admin-panel
npx nx g @spartan-ng/cli:ui   # yoki eng so'nggi CLI uchun https://spartan.ng ga qarang
```

Joriy sahifalar Tailwind utility komponentlaridan (`styles.css` dagi `.btn`,
`.card`, `.input`, `.table`) foydalanadi, shuning uchun ular spartan siz ham
ko'rinadi; ularni bosqichma-bosqich Helm komponentlariga almashtiring.

## Ma'lumotlar bazasi sxemasi

`libs/database/prisma/schema.prisma` ga qarang. Asosiy modellar: `User`,
`AdminAccount`, `JobPost`, `Application`, `DepositRequest`, `VipPurchase`,
`BalanceTransaction`, `PendingRequest`, `Complaint`, `Settings`, `AuditLog`.

## Arxitektura haqida eslatmalar

- Botlar va backend `@soatbay/database` Prisma klienti orqali bir xil bazadan
  foydalanadi.
- Botlar admin ko'rib chiqishi uchun `PendingRequest` yozuvlarini yozadi (e'lon /
  hisob to'ldirish / ro'yxatdan o'tish / yozilish). Backend ning `pending` moduli
  ularni o'qiydi va tasdiqlash/ogohlantirish/bloklash/bekor qilish amallarini
  bajaradi, bot tokenlari orqali Telegram xabarnomalarini yuboradi
  (`TelegramNotifyService`) va tasdiqlangan e'lonlarni kanalga joylaydi.
- Botga oid o'zbekcha matnlar so'zlashuv izchilligini saqlash va tekshirishni
  oson qilish uchun `libs/common/src/messages.ts` va `templates.ts` da
  markazlashtirilgan.

## Skriptlar

| Skript | Tavsif |
| --- | --- |
| `npm run docker:up` / `docker:down` | Postgres + Redis ni ishga tushirish/to'xtatish |
| `npm run db:generate` | Prisma klientini generatsiya qilish |
| `npm run db:migrate` | Dev migratsiyalarni bajarish |
| `npm run db:deploy` | Migratsiyalarni qo'llash (prod) |
| `npm run db:seed` | Admin + sozlamalarni seed qilish |
| `npm run db:studio` | Prisma Studio ni ochish |
| `npm run build` | Barcha workspace loyihalarini qurish |
| `npm run typecheck` | Barcha loyihalarni tip tekshiruvidan o'tkazish |

## Holat

Bu ishlab chiqarishga tayyor **skelet**: arxitektura, ma'lumotlar bazasi
sxemasi, barcha bot FSM oqimlari, backend modullari/endpointlari va admin
sahifalari joyida. Qolgan takomillashtirish ishlari: skrinshot/cheklar uchun
fayllarni ko'rsatish allaqachon qo'shilgan (Telegram fayl proksisi), tests.
```
# soatbay-uz
# soatbay-uz
# soatbay-uz
