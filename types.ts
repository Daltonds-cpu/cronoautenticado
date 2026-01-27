
export interface SlotData {
  id: number;
  occupantName: string;
  occupantAvatar: string;
  occupantId?: string; // UID do usuário no Firebase
  title: string;
  imageUrl: string;
  startTime: number; // timestamp
  likes: number;
  position: [number, number, number]; // 3D coordinates
  sides: number; // 5 for pentagon, 6 for hexagon
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  title: string;
  finalDurationSeconds: number;
  timestamp: number;
}

export interface UserProfile {
  name: string;
  avatar: string;
  maxTimeSeconds: number;
  totalLikes: number;
  likedPosts?: string[]; // Array de strings "slotId-startTime"
}

export interface Notification {
  id: string;
  message: string;
  timestamp: number;
}
