import type { ReactNode } from "react";

export type ID = string;

export interface LoadingState {
  loading: boolean;
  error: Error | null;
}

export interface DataState<T> extends LoadingState {
  data: T | null;
}

export interface FormState {
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FileWithPreview extends File {
  preview: string;
  id?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

export type ThemeMode = "light" | "dark";

export interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  fontFamily: string;
}

export interface NavItem {
  title: string;
  path: string;
  icon?: string;
  children?: NavItem[];
  disabled?: boolean;
  external?: boolean;
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface TableColumn<T = unknown, TValue = unknown> {
  id: string;
  label: string;
  minWidth?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  format?: (value: TValue, row?: T) => ReactNode;
}

export interface ModalState<T = unknown> {
  open: boolean;
  data?: T;
}

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export type ValueOf<T> = T[keyof T];
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

export interface CrudOperations<T, CreateData = Partial<T>, UpdateData = Partial<T>, ListParams = unknown> {
  create: (data: CreateData) => Promise<T>;
  read: (id: ID) => Promise<T | null>;
  update: (id: ID, data: UpdateData) => Promise<T>;
  delete: (id: ID) => Promise<void>;
  list: (params?: ListParams) => Promise<T[]>;
}

