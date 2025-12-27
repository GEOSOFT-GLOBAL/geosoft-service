interface IResponse {
  status: number;
  success: boolean;
  message?: string;
  data?: object | null;
  metadata?: object | null;
}

export interface HttpExceptionInterface {
  status: number;
  message: string;
  payload?: object;
  stack?: string | undefined;
  isPublic?: boolean | undefined;
  errorData?: Record<string, any>;
}