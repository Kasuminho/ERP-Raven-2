export type SearchResult = {
  id: string;
  kind: 'item' | 'auction' | 'event' | 'player';
  title: string;
  subtitle: string;
  href: string;
};

