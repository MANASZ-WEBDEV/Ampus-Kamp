import { apiClient }    from '@/lib/apiClient';
import type { HomeData } from '../types';

export async function getHomeData(): Promise<HomeData> {
  const res = await apiClient.get<{ data: HomeData }>('/home');
  return res.data.data;
}
