export interface Film {
  title: string;
  year: string;
  slug: string;
  url: string;
  artworkUrl?: string;
}

export interface ListInfo {
  owner: string;
  url: string;
  count: number;
  label: string;
}

export interface SpinResponse {
  film: Film;
  list: ListInfo;
}

export interface ApiError {
  error: string;
}