export interface ClickUpRawMessage {
  id: string;
  content: string;
  date?: number | string;
  user_id?: number | string;
  type?: string;
  resolved?: boolean;
}

export interface ClickUpPrItem {
  prUrl: string;
  owner: string;
  repo: string;
  prNumber: number;
  messageId: string;
  author: string;
  date: string;
}

export interface ClickUpPage {
  items: ClickUpPrItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ClickUpSprint {
  id: string;
  name: string;
}

export interface ClickUpMember {
  id: number;
  name: string;
  email: string;
}

export interface ClickUpSignoffTask {
  id: string;
  name: string;
  url: string;
  assigneeEmails: string[];
}

export interface ClickUpSignoffDoc {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface ClickUpSignoffDocPage {
  docs: ClickUpSignoffDoc[];
  nextCursor: string | null;
}
