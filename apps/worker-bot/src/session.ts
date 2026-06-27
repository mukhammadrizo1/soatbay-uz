import { Context, SessionFlavor } from 'grammy';

export enum Step {
  IDLE = 'idle',
  // Oferta + ro'yxatdan o'tish
  OFFER = 'offer',
  REG_FULLNAME = 'reg_fullname',
  REG_PHONE = 'reg_phone',
  REG_AGE = 'reg_age',
  REG_PASSPORT = 'reg_passport',
  REG_CONFIRM = 'reg_confirm',
  // Yozilish oqimi
  APPLY_DISTANCE = 'apply_distance',
  APPLY_PAYMENT_CHECK = 'apply_payment_check',
  // Menyu quyi oqimlari
  TOPUP_CHECK = 'topup_check',
  CHANGE_PHONE = 'change_phone',
  COMPLAINT = 'complaint',
}

export interface RegistrationDraft {
  fullName?: string;
  phone?: string;
  age?: number;
  passportPhotoFileId?: string;
}

export interface SessionData {
  step: Step;
  reg: RegistrationDraft;
  /** Ishchi hozir yozilayotgan e'lon. */
  applyPostId?: string;
  /** Masofa / to'lov yig'ilayotgandagi jarayondagi ariza ID si. */
  applicationId?: string;
  /** Shu epoch ms dan keyin karta-chek to'lovi qabul qilinmaydi. */
  paymentDeadline?: number;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export function initialSession(): SessionData {
  return { step: Step.IDLE, reg: {} };
}
