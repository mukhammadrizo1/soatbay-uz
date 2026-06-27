import {
  ApplicationStatus,
  ComplaintStatus,
  JobMeal,
  JobPostStatus,
  JobStartDay,
} from './enums';
import { GeoLocation } from './interfaces';

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
  username: string;
}

export interface CreateJobPostDto {
  /** Mavjud mijoz tanlangan bo'lsa uning id si. Yangi mijoz yaratilsa bo'sh. */
  employerId?: string;
  /** Yangi mijoz yaratish uchun (employerId berilmaganda). */
  clientName?: string;
  clientPhone?: string;
  startDay: JobStartDay;
  workersNeeded: number;
  salaryPerPerson: number;
  meal: JobMeal;
  startTime: string;
  endTime: string | null;
  address: string;
  location: GeoLocation | null;
  buses: string | null;
  description: string;
  contactPhone: string;
}

export interface UpdateJobPostDto extends Partial<CreateJobPostDto> {
  serviceFee?: number | null;
  status?: JobPostStatus;
}

export interface ApproveJobPostDto {
  serviceFee?: number | null;
}

export interface RejectWithMessageDto {
  message?: string;
  block?: boolean;
}

export interface BlockUserDto {
  reason?: string;
}

export interface UpdateWorkerDto {
  fullName?: string;
  phone?: string;
  age?: number;
  passportPhotoUrl?: string;
}

export interface AdjustBalanceDto {
  amount: number;
  reason?: string;
}

export interface ToggleVipDto {
  enabled: boolean;
  /** Yoqishda ixtiyoriy tugash sanasi (ISO). Berilmasa standart muddat ishlatiladi. */
  expiresAt?: string | null;
}

export interface UpdateSettingsDto {
  cardNumber?: string;
  cardHolderName?: string;
  vipPrice?: number;
}

export interface ApplicationListItemDto {
  id: string;
  jobPostId: string;
  workerName: string;
  workerPhone: string;
  status: ApplicationStatus;
  jobDate: Date;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
  status?: string;
}

export interface UpdateComplaintStatusDto {
  status: ComplaintStatus;
  /** `resolved` uchun majburiy: foydalanuvchiga yuboriladigan admin javobi. */
  adminNote?: string;
}

export interface SendMessageDto {
  text?: string;
}
