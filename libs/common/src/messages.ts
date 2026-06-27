import { formatSom } from './formatters';

/**
 * Botga oid barcha o'zbekcha matnlarning markaziy katalogi, mahsulot
 * spetsifikatsiyasidan aynan saqlangan (emoji va so'zlashuv bilan birga).
 * So'zlashuvni spetsifikatsiya bilan moslab turing.
 */
export const MSG = {
  // ── Umumiy (barcha joyda) ──
  blocked: (reason?: string | null) => {
    const intro = reason?.trim()
      ? `Sizning hisobingiz bloklangan. Sabab: ${reason.trim()}`
      : 'Sizning hisobingiz bot qoidalarini buzganingiz uchun bloklangan.';
    return `${intro}\n\nOchish uchun @Soatbay_admin ga murojaat qiling.`;
  },

  // ── Umumiy tugmalar ──
  btn: {
    back: '⬅️ Orqaga',
    mainMenu: '🏠 Asosiy menyu',
    skip: "O'tkazib yuborish",
    confirm: 'Tasdiqlash',
    cancel: 'Bekor qilish',
    today: 'Bugun',
    tomorrow: 'Ertaga',
    mealOnce: '1 mahal',
    mealTwice: '2 mahal',
    mealNone: "yo'q",
  },

  // ── Ro'yxatdan o'tish (umumiy) ──
  askFullName: "Iltimos to'liq F.I.O. kiriting:",
  askPhone:
    "📞 Telefon raqamingizni kiriting:\nMisol: +998901234567 yoki 901234567",
  invalidPhone:
    "❌ Telefon raqam noto'g'ri formatda. Misol: +998901234567 yoki 901234567",
  phoneExistsEmployer:
    "Siz allaqachon ro'yxatdan o'tgansiz. Iltimos @soatbay_uz_admin ga murojaat qiling.",
  phoneTaken:
    "Bu telefon raqami boshqa foydalanuvchiga tegishli. Iltimos @soatbay_uz_admin ga murojaat qiling.",
  cannotApplyOwnPost:
    "O'z e'loningizga ishchi sifatida yozila olmaysiz.",
  invalidFullName: "❌ Iltimos to'liq F.I.O. kiriting.",
  reregisterPrompt:
    "Admin sizdan ma'lumotlaringizni qayta kiritishingizni so'radi.\nIltimos to'liq F.I.O. kiriting:",
  adminReregisterClient:
    "ℹ️ Admin sizdan qayta ro'yxatdan o'tishingizni so'radi.\nIltimos /start bosing va ma'lumotlaringizni qayta kiriting.",
  adminReregisterWorker:
    "ℹ️ Admin sizdan qayta ro'yxatdan o'tishingizni so'radi.\nIltimos /start bosing, ofertani qabul qiling va ma'lumotlaringizni qayta yuboring.",

  // ── Ish beruvchi asosiy menyu yorliqlari ──
  employerMenu: {
    createPost: "E'lon berish",
    myPosts: "Mening e'lonlarim",
    inProgress: "Jarayondagi e'lonlar",
    editPost: "E'lonni tahrirlash",
    applicants: 'Ishga yozilganlar',
    repost: "Qayta e'lon berish",
    editProfile: 'Profilni tahrirlash',
  },

  // ── Ish beruvchi e'lon yaratish FSM so'rovlari ──
  create: {
    when: '📅 Ish qachon boshlanadi?',
    workersNeeded: '🫂 Kerakli ishchilar soni? Misol: 10',
    salary: "💰 Ish haqqini kiriting (har bir kishi uchun): Misol: 200 000",
    meal: "🍛 Ovqat haqida ma'lumot:",
    startTime: '⏰ Ish boshlanish vaqtini kiriting: Misol 08:30',
    endTime:
      "⏰ Ish tugash vaqtini kiriting yoki agar ish tugaguncha bo'lsa shunchaki o'tkazib yuboring tugmasini bosing:",
    address: '📍 Manzilni kiriting: Misol: Sergeli 1-mavze, Compass yonida',
    location:
      '📍 Lokatsiyani yuboring:\n(Lokatsiyani forward qiling yoki koordinatalarni kiriting)',
    buses: "🚌 Avtobuslarni kiriting yoki o'tkazib yuboring: Misol 14, 16, 135м",
    description: "📝 Ish haqida va qo'shimcha ma'lumotlar:",
    contactPhone:
      '📞 Ish uchun telefon raqamini kiriting: Misol: +998901234567',
  },

  errInvalidChoice: 'Iltimos menyudan tanlang',
  errNotInteger: "❌ Iltimos butun son kiriting. Misol: 10",
  errInvalidAmount: "❌ Iltimos summani to'g'ri kiriting. Misol: 200 000",
  errInvalidTime: "❌ Iltimos vaqtni to'g'ri kiriting. Misol: 08:30",
  errStartTimeTooSoon:
    "❌ Bugungi ish uchun boshlanish vaqti hozirgidan kamida 30 daqiqa keyin bo'lishi kerak.",
  errInvalidLocation:
    '❌ Iltimos lokatsiyani forward qiling yoki koordinatalarni kiriting. Misol: 41.311, 69.279',

  endTimeUntilDone: 'ish tugaguncha',
  notProvided: 'Kiritilmagan',

  postCreated: (id: string | number) =>
    `✅ E'loningiz adminga tekshiruvga yuborildi.\nE'lon ID: #${id}\n\n${MSG.employer.fakeDataWarningShort}`,
  postPublishedVip: (id: string | number) =>
    `✅ E'loningiz kanalga joylandi.\nE'lon ID: #${id}\n\n${MSG.employer.fakeDataWarningShort}`,
  postCancelled: "❌ E'lon yaratish bekor qilindi.",

  // ── Ish beruvchi: e'lon to'lganda avtomatik xabar ──
  employer: {
    fakeDataWarning: `⚠️ MUHIM OGOHLANTIRISH

E'lon berishda faqat haqiqiy va to'g'ri ma'lumotlarni kiriting.
Soxta, noto'g'ri yoki chalg'ituvchi ma'lumot bilan e'lon bersangiz adminlar hisobingizni bloklashi mumkin.`,

    fakeDataWarningShort:
      "⚠️ Soxta yoki noto'g'ri ma'lumot bilan e'lon bersangiz adminlar hisobingizni bloklashi mumkin.",

    jobFullWorkersList: (seq: number, workersList: string) =>
      `✅ #${seq} raqamli ishga quyidagi ishchilar yozildi:\n\n${workersList}\n\nAgar biror kishi ishga kelmay qolsa yoki biror muammo bo'lsa @Soatbay_admin ga murojaat qiling.`,
  },

  // ── Ish beruvchi boshqa amallari ──
  askPostId: "E'lon ID raqamini kiriting:",
  postNotFound:
    "❌ Bunday e'lon topilmadi yoki sizga tegishli emas.",
  noPosts: "Sizda hali e'lonlar yo'q.",
  noInProgressPosts: "Jarayondagi e'lonlar yo'q.",
  applicantsHeader: "👥 Ishga yozilganlar:",
  noApplicants: "Bu e'longa hali hech kim yozilmagan.",
  repostEdit: 'Tahrirlash',
  repostPublish: 'Qayta chiqarish',
  editProfileFio: "F.I.O. ni o'zgartirish",
  editProfilePhone: "Telefon raqamni o'zgartirish",
  profileUpdated: "✅ Ma'lumotlar yangilandi.",

  // ── Har bir maydon uchun tahrirlash menyusi (E'lonni tahrirlash / Qayta e'lon berish) ──
  editFieldsTitle: 'Qaysi maydonni tahrirlamoqchisiz?',
  editSaved: "✅ E'lon yangilandi.",
  saveBtn: '✅ Saqlash',
  editFields: {
    when: '📅 Sana',
    workers: '🫂 Ishchilar soni',
    salary: '💰 Ish haqqi',
    meal: '🍛 Ovqat',
    startTime: '⏰ Boshlanish vaqti',
    endTime: '⏰ Tugash vaqti',
    address: '📍 Manzil',
    location: '📍 Lokatsiya',
    buses: '🚌 Avtobuslar',
    description: "📝 Qo'shimcha",
    contactPhone: '📞 Telefon',
  },

  // ── Sahifalash ──
  prevPage: '⬅️ Oldingi',
  nextPage: 'Keyingi ➡️',

  // ── Ishchi bot ──
  worker: {
    offerRejected:
      "❌ Siz ofertani qabul qilmaganingiz uchun botdan foydalana olmaysiz.\nAgar fikringiz o'zgarsa, qaytadan ofertani qabul qilishingiz mumkin.",
    offerAccept: 'Qabul qilish',
    offerReject: 'Rad etish',
    offerRestart: 'Qaytadan boshlash',
    askAge: '🎂 Yoshingizni kiriting (18-65):',
    invalidAge: "❌ Yosh 18 dan 65 gacha bo'lishi kerak.",
    askPassport: '📸 Pasport rasmingizni yuboring:',
    invalidPassport: '❌ Iltimos pasport rasmini surat ko\'rinishida yuboring.',
    confirmData: 'Tasdiqlayman',
    reenterData: "Yo'q, qayta kiritaman",
    registrationSentToAdmin:
      "✅ Ma'lumotlaringiz adminga tasdiqlash uchun yuborildi.",
    justRegistered: '@Soatbay_uz kanalimizda ishlarni topishingiz mumkin.',

    /** Ishga yozilishdan oldin/to'lovdan oldin ko'rsatiladigan to'liq ogohlantirish. */
    noShowWarning: `⚠️ MUHIM OGOHLANTIRISH

Ishga yozilgach belgilangan vaqtda ish joyiga kelmasangiz:
• hisobingizdan yechilgan xizmat haqi qaytarilmaydi;
• VIP tarif imkoniyatingiz bekor qilinishi yoki cheklanishi mumkin;
• qo'shimcha jarima qo'llanilishi mumkin;
• hisobingiz vaqtincha yoki butunlay bloklanishi mumkin.

Faqat ishga borishingizga ishonchingiz komil bo'lsa yoziling.`,

    /** Qisqa eslatma (tasdiqlash kartalari va muvaffaqiyat xabarlarida). */
    noShowWarningShort:
      "⚠️ Eslatma: ishga kelmasangiz xizmat haqi qaytarilmaydi, VIP bekor qilinishi, jarima va hisob bloklanishi mumkin.",

    alreadyBusy:
      "Siz ushbu sana uchun allaqachon ishga yozilgansiz. Boshqa kungi ishlarga yozilishingiz mumkin.",
    alreadyPending: "Sizda jarayonda allaqachon e'lon bor, kuting.",
    checkingSlots: "⏳ Bo'sh ish o'rin bor yo'qligi tekshirilmoqda, kuting...",
    noSlots:
      "Ushbu e'lon uchun allaqachon o'rinlar to'lgan, iltimos boshqa ishlarni ko'ring.",
    askDistanceScreenshot:
      "Qayerdasiz, nechchi kilometr ko'rsatyapti? ☝️ Yuqoridagi lokatsiyani ochib skrinshot yuboring! Eslatma: Telefoningiz joylashuvi yoqilganligiga e'tibor bering!",
    screenshotAccepted: '✅ Lokatsiya screenshot qabul qilindi!',
    appliedSuccess: (employerName: string, employerPhone: string) =>
      `✅ Siz ishga muvaffaqiyatli yozildingiz.\n\n👤 ${employerName}\n📞 ${employerPhone}\n\n${MSG.worker.noShowWarningShort}\n\nIltimos, belgilangan vaqtda ish joyiga o'z vaqtida keling.`,

    // menyu
    menu: {
      myApplications: 'Mening ish arizalarim',
      myInfo: "Mening ma'lumotlarim",
      support: "Qo'llab quvvatlash",
      complaint: 'Shikoyat va takliflar',
      topup: "Hisobni to'ldirish",
      buyVip: 'VIP sotib olish',
      changePhone: 'Raqamni almashtirish',
    },

    buyVipBtn: 'Vipni sotib olish',
    insufficientForVip: (amount: number) =>
      `Iltimos hisobingizni ${formatSom(amount)} ga to'ldiring va qayta urinib ko'ring.`,
    topupAccepted:
      "✅ Chek qabul qilindi va adminga tekshirish uchun yuborildi.",
    paymentCheckAccepted:
      "✅ To'lov cheki qabul qilindi va adminga tekshirish uchun yuborildi.\n\nTasdiqlangach ishga yozilgan hisoblanasiz. Ishga kelmasangiz xizmat haqi qaytarilmaydi va jarima yoki blok qo'llanilishi mumkin.",
    paymentExpired:
      "⏱ To'lov uchun berilgan 3 daqiqa muddati tugadi. Iltimos qaytadan urinib ko'ring.",
    onlyPhoto: '⚠️ Faqat rasm yuboring, file yoki boshqa ma\'lumot yubormang.',
    complaintSent: "✅ Murojaatingiz qabul qilindi.",
    complaintPrompt:
      "📝 Iltimos bu yerda faqatgina botni ishlashi bo'yicha shikoyat yoki taklifingizni yozing.\nBoshqa masalalar bo'yicha @Soatbay_admin ga murojaat qiling\n\nIltimos botdagi yozishmalar chatini screenshot qilib yuboring va vaziyatni batafsilroq tushuntiring",
    support:
      "📞 Qo'llab-quvvatlash xizmati:\n\n⏰ Ish vaqti: 08:00 - 23:00\n📅 Ish kunlari: Dushanba - Yakshanba\n\n📱 @Soatbay_admin",
    vipInfo: (price: number) =>
      `Vip tarifda quyidagi imkoniyatlar mavjud:\n\nSiz istalgan ishga 30 kun davomida xizmat haqi to'lamay chiqishingiz mumkin.\n\nVip narxi: ${formatMoneyDotted(price)} so'm\n\nHech qanday kutishlarsiz ishga yoziling.\n\n⚠️ VIP bilan yozilib ishga kelmasangiz VIP imkoniyati bekor qilinishi, jarima qo'llanilishi va hisobingiz bloklanishi mumkin.`,
    myApplicationsHeader:
      "📋 Mening ish arizalarim\n\n⚠️ Tasdiqlangan ishga kelmasangiz xizmat haqi, VIP yoki hisobingizga jarima qo'llanilishi mumkin.\n",
  },

  // ── Kanal ──
  channel: {
    slotsOpened: (count: number) =>
      `🟢 Ushbu ishga ${count} ta ishchi olib tashlandi — ${count} ta joy ochildi.`,
  },

  // ── Admin standart rad etish / ogohlantirish matnlari ──
  admin: {
    postWarnDefault:
      "Iltimos ma'lumotlarni tekshirib elonni qaytadan yuboring.",
    postBlock:
      'Siz soxta ma\'lumotlar bilan elon yaratishga urinayapsiz shu sababli hisobingiz bloklandi @soatbay_admin ga murojaat qiling.',
    topupWarnDefault:
      "Iltimos ma'lumotlarni tekshirib hisob to'ldirish so'rovini qaytadan yuboring.",
    topupCancel:
      'Siz soxta ma\'lumotlar bilan to\'ldirishga urinayapsiz, bu hisobingiz bloklanishiga olib kelishi mumkin.',
    registrationWarnDefault:
      "Iltimos ma'lumotlarni tekshirib ro'yxatdan o'tishni qaytadan yuboring.",
    registrationCancel:
      'Siz soxta ma\'lumotlar bilan ishchi bo\'lishga urinayapsiz shu sababli hisobingiz bloklandi @soatbay_admin ga murojaat qiling.',
    applicationWarnDefault:
      "Iltimos ma'lumotlarni tekshirib so'rovni qaytadan yuboring.",
    applicationCancel:
      'Siz soxta ma\'lumotlar bilan ishga yozilishga urinayapsiz, bu hisobingiz bloklanishiga olib kelishi mumkin.',
    applicationBlock:
      'Siz qoidalarga zid harakat qildingiz, soxta ma\'lumot bilan amaliyot qilishga urundingiz shu sababli hisobingiz bloklandi @soatbay_admin ga murojaat qiling.',
  },
} as const;

/** VIP narxi uchun "300000" ni "300.000" (nuqtali) ko'rinishida formatlaydi. */
function formatMoneyDotted(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
