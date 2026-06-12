// Re-export types from shared schema
export type {
  Project,
  InsertProject,
  WbsItem,
  InsertWbsItem,
  Dependency,
  InsertDependency,
  CostEntry,
  InsertCostEntry,
  Task,
  InsertTask,
  WorkPackage,
  InsertWorkPackage,
  UpdateWbsProgress,
  ImportCosts,
  CsvImportData
} from '@shared/schema';

// Re-export schemas
export {
  insertProjectSchema,
  insertWbsItemSchema,
  insertDependencySchema,
  insertCostEntrySchema,
  insertTaskSchema,
  insertWorkPackageSchema,
  csvImportSchema
} from '@shared/schema';

// Thread and Message types
export type ThreadType =
  | 'quality'
  | 'safety'
  | 'evacuation'
  | 'policy'
  | 'casual'
  | 'issue'
  | 'info'
  | 'announcement'
  | 'awards'
  | 'general';

export type CollabCriticality = 'low' | 'medium' | 'high' | 'critical';

export interface CollabMention {
  userId: number;
  userName: string;
}

export interface Thread {
  id: number;
  title: string;
  subject: string;
  type: ThreadType;
  category: ThreadType;
  criticality: CollabCriticality;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessagePreview?: string | null;
  messageCount: number;
  isClosed: boolean;
  isPinned: boolean;
  pinnedAt?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  unreadMentionCount?: number;
  projectId?: number;
}

export interface Message {
  id: number;
  threadId: number;
  content: string;
  authorId: string;
  authorName: string;
  mentions?: CollabMention[];
  readBy?: { userId: number; readAt: string }[];
  createdAt: string;
  isThreadCreator?: boolean;
}

export interface MentionableUser {
  id: number;
  name: string;
  email: string;
} 