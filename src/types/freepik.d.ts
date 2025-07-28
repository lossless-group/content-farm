declare module 'freepik' {
  export interface FreepikImage {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    premium: boolean;
  }

  export interface FreepikSearchParams {
    query: string;
    limit?: number;
    page?: number;
  }

  export interface FreepikSearchResponse {
    data: Array<{
      id: string;
      url: string;
      title: string;
      image: {
        small: string;
        medium: string;
        large: string;
      };
      premium: boolean;
    }>;
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  }
}
