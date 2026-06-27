import { Context, SessionFlavor } from 'grammy';
import { JobStartDay } from '@soatbay/shared-types';

/** Ish beruvchi bot suhbatlari uchun cheklangan holatli qadamlar. */
export enum Step {
  IDLE = 'idle',
  // Ro'yxatdan o'tish
  ONB_FULLNAME = 'onb_fullname',
  ONB_PHONE = 'onb_phone',
  // E'lon yaratish FSM
  CP_WHEN = 'cp_when',
  CP_WORKERS = 'cp_workers',
  CP_SALARY = 'cp_salary',
  CP_MEAL = 'cp_meal',
  CP_START_TIME = 'cp_start_time',
  CP_END_TIME = 'cp_end_time',
  CP_ADDRESS = 'cp_address',
  CP_LOCATION = 'cp_location',
  CP_BUSES = 'cp_buses',
  CP_DESCRIPTION = 'cp_description',
  CP_CONTACT_PHONE = 'cp_contact_phone',
  CP_CONFIRM = 'cp_confirm',
  // E'lon ID kutayotgan boshqa amallar
  AWAIT_EDIT_ID = 'await_edit_id',
  AWAIT_APPLICANTS_ID = 'await_applicants_id',
  AWAIT_REPOST_ID = 'await_repost_id',
  // Profilni tahrirlash
  EDIT_PROFILE_FIO = 'edit_profile_fio',
  EDIT_PROFILE_PHONE = 'edit_profile_phone',
}

export interface PostDraft {
  startDay?: JobStartDay;
  workersNeeded?: number;
  salaryPerPerson?: number;
  meal?: string;
  startTime?: string;
  endTime?: string | null;
  address?: string;
  location?: { lat: number; lng: number } | null;
  buses?: string | null;
  description?: string;
  contactPhone?: string;
}

export type DraftMode = 'create' | 'edit' | 'repost';

export interface SessionData {
  step: Step;
  fullName?: string;
  /** Admin qayta ro'yxatdan o'tishni yoqqanda true. */
  reregister?: boolean;
  draft: PostDraft;
  /** Joriy qoralama nima uchun: butunlay yangi e'lon, mavjudini tahrirlash,
   *  yoki in-memory qayta e'lon nusxasi. */
  mode?: DraftMode;
  /** Bitta maydon tahrirlanayotganda, keyingi kiritishda yangilanadigan maydon. */
  editField?: keyof PostDraft;
  /** mode === 'edit' bo'lganda mavjud baza e'loni ID si. */
  editingPostId?: string;
  /** Qayta e'lon faqat chiqarishda saqlanadigan in-memory nusxada ishlaydi. */
  repostSourceId?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export function initialSession(): SessionData {
  return { step: Step.IDLE, draft: {} };
}

/** Orqaga navigatsiya uchun e'lon yaratish qadamlarining tartiblangan ro'yxati. */
export const CREATE_STEP_ORDER: Step[] = [
  Step.CP_WHEN,
  Step.CP_WORKERS,
  Step.CP_SALARY,
  Step.CP_MEAL,
  Step.CP_START_TIME,
  Step.CP_END_TIME,
  Step.CP_ADDRESS,
  Step.CP_LOCATION,
  Step.CP_BUSES,
  Step.CP_DESCRIPTION,
  Step.CP_CONTACT_PHONE,
  Step.CP_CONFIRM,
];
