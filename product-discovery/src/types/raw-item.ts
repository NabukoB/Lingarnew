export interface RawItem {
  id: number;
  title: string;
  brand: string;
  category: string;
  tags: string[];
  price: number | string | null;
  rating: number | null;
  reviews: number;
  inStock: boolean;
  releasedAt: string;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  description: string | null;
}
