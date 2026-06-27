import { InlineKeyboard, Keyboard } from 'grammy';
import { MSG } from '@soatbay/common';

export function mainMenuKeyboard(): Keyboard {
  return new Keyboard()
    .text(MSG.worker.menu.myApplications)
    .text(MSG.worker.menu.myInfo)
    .row()
    .text(MSG.worker.menu.support)
    .text(MSG.worker.menu.complaint)
    .resized();
}

export function offerKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.worker.offerAccept, 'offer:accept')
    .text(MSG.worker.offerReject, 'offer:reject');
}

export function offerRestartKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(MSG.worker.offerRestart, 'offer:restart');
}

export function regConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.worker.confirmData, 'reg:confirm')
    .text(MSG.worker.reenterData, 'reg:reenter');
}

export function infoMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.worker.menu.topup, 'info:topup')
    .text(MSG.worker.menu.buyVip, 'info:vip')
    .row()
    .text(MSG.worker.menu.changePhone, 'info:phone')
    .text(MSG.btn.mainMenu, 'info:menu');
}

export function buyVipKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(MSG.worker.buyVipBtn, 'vip:buy');
}

export function applyConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(MSG.btn.confirm, 'apply:confirm')
    .text(MSG.btn.cancel, 'apply:cancel');
}

export function cancelToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(MSG.btn.mainMenu, 'info:menu');
}
