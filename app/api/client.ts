export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public originalError?: unknown,
  ) {
    super(`API Error: ${statusCode}`);
    this.name = "ApiError";
  }
}

// Access token cached in-memory
let cachedAccessToken: string | null = null;

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return cachedAccessToken || localStorage.getItem("accessToken");
  }
  return null;
};

export const setAuthToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  }
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken");
  }
  return null;
};

export const setRefreshToken = (token: string | null) => {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("refreshToken", token);
    } else {
      localStorage.removeItem("refreshToken");
    }
  }
};

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

const getBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const baseUrl = getBaseUrl();
    const url = baseUrl + endpoint;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: unknown;
    const contentType = response.headers.get("content-type");
    try {
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch {
      data = null;
    }

    if (response.ok) {
      return {
        success: true,
        data: data as T,
        status: response.status,
      };
    }

    // Attempt silent refresh on 401 Unauthorized
    if (response.status === 401) {
      if (
        endpoint !== "/api/auth/refresh" &&
        endpoint !== "/api/auth/login" &&
        endpoint !== "/api/auth/oauth2/google"
      ) {
        try {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            console.log("Token expired. Attempting silent refresh...");
            const refreshUrl = baseUrl + "/api/auth/refresh";
            const refreshResponse = await fetch(refreshUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const newAccessToken = refreshData.accessToken;
              const newRefreshToken = refreshData.refreshToken;

              if (newAccessToken) {
                setAuthToken(newAccessToken);
                if (newRefreshToken) {
                  setRefreshToken(newRefreshToken);
                }
                console.log("Silent refresh succeeded. Retrying request...");

                const retriedHeaders = {
                  ...headers,
                  Authorization: `Bearer ${newAccessToken}`,
                };
                return apiRequest<T>(endpoint, {
                  ...options,
                  headers: retriedHeaders,
                });
              }
            }
          }
        } catch {
          console.error("Silent token refresh error");
        }
      }

      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    throw new ApiError(response.status, data);
  } catch (error) {
    console.error("API Request Error: ", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        error: (error.originalError as { message?: string })?.message || error.message || "Request failed",
        status: error.statusCode,
      };
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
      status: 0,
    };
  }
}

export const apiGet = <T>(endpoint: string): Promise<ApiResponse<T>> =>
  apiRequest<T>(endpoint, { method: "GET" });

export const apiPost = <T>(
  endpoint: string,
  body?: unknown,
): Promise<ApiResponse<T>> =>
  apiRequest<T>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiPut = <T>(
  endpoint: string,
  body?: unknown,
): Promise<ApiResponse<T>> =>
  apiRequest<T>(endpoint, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiDelete = <T>(endpoint: string): Promise<ApiResponse<T>> =>
  apiRequest<T>(endpoint, { method: "DELETE" });

export interface UserDto {
  id: string;
  email: string;
  username: string;
  role: string;
  imageUrl?: string;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  exp: number;
  level: number;
  studyTime: number;
  lastActiveDate?: string;
  suspended?: boolean;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export const authActions = {
  login: (email: string, password: string, remember = true): Promise<ApiResponse<TokenResponse>> =>
    apiPost("/api/auth/login", { email, password, remember }),
  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiPost("/api/auth/logout", { refreshToken });
      } catch (err) {
        console.error("Logout request failed:", err);
      }
    }
    setAuthToken(null);
    setRefreshToken(null);
    if (typeof window !== "undefined") {
      try {
        const { signOut } = await import("next-auth/react");
        await signOut({ redirect: false });
      } catch (err) {
        console.error("NextAuth signOut failed:", err);
      }
    }
  },
  googleLogin: (code: string, redirectUri: string): Promise<ApiResponse<{ token: TokenResponse }>> =>
    apiPost("/api/auth/oauth2/google", { code, redirectUri }),
  getMe: (): Promise<ApiResponse<UserDto>> => apiGet("/api/auth/me"),
};

export const userActions = {
  getUsers: (): Promise<ApiResponse<UserDto[]>> => apiGet("/api/users/all"),
  searchUsers: (query: string, page = 0, size = 10): Promise<ApiResponse<PageResponse<UserDto>>> => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    params.append("page", page.toString());
    params.append("size", size.toString());
    return apiGet(`/api/users/search?${params.toString()}`);
  },
  getUserProfile: (id: string): Promise<ApiResponse<UserDto>> => apiGet(`/api/users/${id}`),
  suspendUser: (id: string, suspended: boolean): Promise<ApiResponse<UserDto>> =>
    apiPut(`/api/users/${id}/suspend?suspended=${suspended}`),
  deleteUser: (id: string): Promise<ApiResponse<void>> =>
    apiDelete(`/api/users/${id}`),
  changeUserRole: (id: string, role: string): Promise<ApiResponse<UserDto>> =>
    apiPut(`/api/users/${id}/role?role=${role}`),
};

export interface ChatResponse {
  id: string;
  name?: string;
  isPublic: boolean;
  createdAt: string;
}

export const chatActions = {
  createChat: (name: string, members: string[], isPublic = false): Promise<ApiResponse<ChatResponse>> =>
    apiPost<ChatResponse>("/api/chats", { name, members, isPublic }),
  sendMessage: (chatId: string, text: string): Promise<ApiResponse<unknown>> =>
    apiPost(`/api/messages/chat/${chatId}`, { text }),
};
