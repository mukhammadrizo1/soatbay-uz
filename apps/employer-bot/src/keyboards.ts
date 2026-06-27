import { InlineKeyboard, Keyboard } from 'grammy';
import { MSG } from '@soatbay/common';

export function mainMenuKeyboard(): Keyboard {
  return new Keyboard()
    .text(MSG.employerMenu.createPost)
    .row()
    .text(MSG.employerMenu.myPosts)
    .text(MSG.employerMenu.inProgress)
    .row()
    .text(MSG.employerMenu.editPost)
    .text(MSG.employerMenu.applicants)
    .row()
    .text(MSG.employerMenu.repost)
    .text(MSG.employerMenu.editProfile)
    .resized();
}

/** Har bir e'lon yaratish qadamida bo'ladigan inline Orqaga + Asosiy menyu tugmalari. */
export function stepControls(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.btn.back, 'cp:back')
    .text(MSG.btn.mainMenu, 'cp:menu');
}

export function whenKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.btn.today, 'cp:when:today')
    .text(MSG.btn.tomorrow, 'cp:when:tomorrow')
    .row()
    .text(MSG.btn.back, 'cp:back')
    .text(MSG.btn.mainMenu, 'cp:menu');
}

export function mealKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.btn.mealOnce, 'cp:meal:1')
    .text(MSG.btn.mealTwice, 'cp:meal:2')
    .text(MSG.btn.mealNone, 'cp:meal:none')
    .row()
    .text(MSG.btn.back, 'cp:back')
    .text(MSG.btn.mainMenu, 'cp:menu');
}

export function skipKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.btn.skip, 'cp:skip')
    .row()
    .text(MSG.btn.back, 'cp:back')
    .text(MSG.btn.mainMenu, 'cp:menu');
}

export function confirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.btn.confirm, 'cp:confirm')
    .text(MSG.btn.cancel, 'cp:cancel');
}

export function cancelToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(MSG.btn.mainMenu, 'cp:menu');
}

/**
 * "E'lonni tahrirlash" va qayta e'lon muharriri ishlatadigan har maydon tahrirlash menyusi.
 * Yakuniy amal tugmasi rejimga qarab farq qiladi: bazaga saqlash (tahrirlash) yoki qayta chiqarish.
 */
export function editFieldsKeyboard(mode: 'edit' | 'repost'): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(MSG.editFields.when, 'field:when')
    .text(MSG.editFields.workers, 'field:workers')
    .row()
    .text(MSG.editFields.salary, 'field:salary')
    .text(MSG.editFields.meal, 'field:meal')
    .row()
    .text(MSG.editFields.startTime, 'field:starttime')
    .text(MSG.editFields.endTime, 'field:endtime')
    .row()
    .text(MSG.editFields.address, 'field:address')
    .text(MSG.editFields.location, 'field:location')
    .row()
    .text(MSG.editFields.buses, 'field:buses')
    .text(MSG.editFields.description, 'field:description')
    .row()
    .text(MSG.editFields.contactPhone, 'field:contact')
    .row();
  if (mode === 'edit') {
    kb.text(MSG.saveBtn, 'edit:save');
  } else {
    kb.text(MSG.repostPublish, 'repost:publish');
  }
  kb.text(MSG.btn.mainMenu, 'cp:menu');
  return kb;
}

/** Ro'yxat ko'rinishlari uchun sahifalash tugmalari (Mening e'lonlarim / Jarayondagi). */
export function paginationKeyboard(
  prefix: string,
  page: number,
  totalPages: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (page > 1) kb.text(MSG.prevPage, `${prefix}:${page - 1}`);
  if (page < totalPages) kb.text(MSG.nextPage, `${prefix}:${page + 1}`);
  return kb;
}
