import { MSG } from '@soatbay/common';
import { BotContext, Step } from '../session';

/** Faol oqimda noto'g'ri xabar yuborilganda asosiy menyuga o'tkazmaslik. */
export async function handleUnexpectedInput(ctx: BotContext): Promise<boolean> {
  switch (ctx.session.step) {
    case Step.REG_PASSPORT:
      await ctx.reply(MSG.worker.invalidPassport);
      return true;
    case Step.REG_CONFIRM:
      await ctx.reply(MSG.worker.regUseButtons);
      return true;
    case Step.APPLY_DISTANCE:
    case Step.APPLY_PAYMENT_CHECK:
    case Step.TOPUP_CHECK:
      await ctx.reply(MSG.worker.onlyPhoto);
      return true;
    case Step.OFFER:
      await ctx.reply(MSG.worker.offerUseButtons);
      return true;
    case Step.REG_FULLNAME:
    case Step.REG_PHONE:
    case Step.REG_AGE:
    case Step.CHANGE_PHONE:
    case Step.COMPLAINT:
      return false;
    default:
      return false;
  }
}
