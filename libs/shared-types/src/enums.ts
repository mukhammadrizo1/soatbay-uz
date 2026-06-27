export enum UserRole {
  EMPLOYER = 'employer',
  WORKER = 'worker',
  ADMIN = 'admin',
}

export enum JobMeal {
  ONCE = '1 mahal',
  TWICE = '2 mahal',
  NONE = "yo'q",
}

export enum JobStartDay {
  TODAY = 'today',
  TOMORROW = 'tomorrow',
}

export enum JobPostStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  INACTIVE = 'inactive',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum ApplicationPaymentMethod {
  VIP = 'vip',
  BALANCE = 'balance',
  CARD_CHECK = 'card-check',
}

export enum DepositStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum VipPurchaseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum BalanceTransactionType {
  TOPUP = 'topup',
  FEE = 'fee',
  VIP = 'vip',
  ADMIN_ADJUST = 'admin-adjust',
  REFUND = 'refund',
}

export enum PendingRequestType {
  POST = 'post',
  TOPUP = 'topup',
  REGISTRATION = 'registration',
  APPLICATION = 'application',
}

export enum PendingRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WARNED = 'warned',
  BLOCKED = 'blocked',
}

export enum AuditActorType {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export enum ComplaintStatus {
  NEW = 'new',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
}
