export interface UserVisitInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  pageUrl: string;
  app: string;
  [key: string]: unknown; // Allow additional properties
}

export interface FirebaseFunctionResponse {
  success: boolean;
  message?: string;
}
