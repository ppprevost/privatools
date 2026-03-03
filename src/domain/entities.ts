export type Comment = {
  id: number;
  tool_slug: string;
  author_name: string;
  content: string;
  ip_hash: string;
  approved: boolean;
  created_at: string;
};

export type PublicComment = Pick<Comment, 'id' | 'author_name' | 'content' | 'created_at'>;

export type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  category: string;
  related_tools: string[];
  og_image: string | null;
};

export type BlogPostSummary = Omit<BlogPost, 'content'>;
