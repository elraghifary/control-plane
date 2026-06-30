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
