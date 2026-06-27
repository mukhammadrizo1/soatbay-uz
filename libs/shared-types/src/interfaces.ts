import {
  ApplicationPaymentMethod,
  ApplicationStatus,
  JobMeal,
  JobPostStatus,
  UserRole,
} from './enums';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface EmployerProfile {
  id: string;
  telegramId: string | null;
  fullName: string;
  phone: string;
  isVip: boolean;
  vipExpiresAt: Date | null;
  isBlocked: boolean;
  createdAt: Date;
}

export interface WorkerProfile {
  id: string;
  telegramId: string | null;
  fullName: string;
  phone: string;
  age: number | null;
  passportPhotoUrl: string | null;
  balance: number;
  isVip: boolean;
  vipExpiresAt: Date | null;
  isBlocked: boolean;
  createdAt: Date;
}

/** @deprecated Use EmployerProfile or WorkerProfile */
export interface UserProfile {
  id: string;
  telegramId: string;
  role: UserRole;
  fullName: string;
  phone: string;
  age: number | null;
  passportPhotoUrl: string | null;
  balance: number;
  isVip: boolean;
  vipExpiresAt: Date | null;
  isBlocked: boolean;
  createdAt: Date;
}

export interface JobPostView {
  id: string;
  employerId: string;
  startDate: Date;
  startDay: 'today' | 'tomorrow';
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
  serviceFee: number | null;
  status: JobPostStatus;
  channelMessageId: number | null;
  createdAt: Date;
}

export interface ApplicationView {
  id: string;
  jobPostId: string;
  workerId: string;
  jobDate: Date;
  distanceScreenshotUrl: string | null;
  paymentMethod: ApplicationPaymentMethod | null;
  status: ApplicationStatus;
  createdAt: Date;
}

export interface AppSettings {
  cardNumber: string;
  cardHolderName: string;
  vipPrice: number;
  vipDurationDays: number;
  minTopupAmount: number;
  feeThresholdLow: number;
  feeThresholdHigh: number;
  feeLow: number;
  feeHigh: number;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole.ADMIN;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
