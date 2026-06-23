import { http } from './http';
import type { PointsBalance, CheckinResp, CheckinStatus, PointsHistory } from './types';

export const pointsApi = {
  get: () => http.get<PointsBalance>('/points'),
  checkinStatus: () => http.get<CheckinStatus>('/points/checkin-status'),
  checkin: () => http.post<CheckinResp>('/points/checkin'),
  history: () => http.get<PointsHistory>('/points/history')
};