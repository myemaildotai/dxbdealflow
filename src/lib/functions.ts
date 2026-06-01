"use client";

import { api } from "./supabase";

type ApiPayload = Record<string, unknown>;

// Example API request/response types
export interface ExampleRequest {
  message: string;
}

export interface ExampleResponse {
  result: string;
}

// API functions wrapper for FastAPI backend calls
export const apiFunctions = {
  // Example API function
  exampleFunction: async (data: ExampleRequest): Promise<ExampleResponse> => {
    return await api.post<ExampleResponse>("/api/example", data);
  },

  // User management functions
  users: {
    getProfile: async <TResponse = unknown>(userId: string) => {
      return await api.get<TResponse>(`/api/users/${userId}`);
    },
    
    updateProfile: async <TResponse = unknown>(userId: string, data: ApiPayload) => {
      return await api.put<TResponse>(`/api/users/${userId}`, data);
    },
    
    deleteProfile: async <TResponse = unknown>(userId: string) => {
      return await api.delete<TResponse>(`/api/users/${userId}`);
    },
  },

  // Items management (example resource)
  items: {
    list: async <TResponse = unknown>() => {
      return await api.get<TResponse>("/api/items");
    },
    
    create: async <TResponse = unknown>(data: ApiPayload) => {
      return await api.post<TResponse>("/api/items", data);
    },
    
    get: async <TResponse = unknown>(itemId: string) => {
      return await api.get<TResponse>(`/api/items/${itemId}`);
    },
    
    update: async <TResponse = unknown>(itemId: string, data: ApiPayload) => {
      return await api.put<TResponse>(`/api/items/${itemId}`, data);
    },
    
    delete: async <TResponse = unknown>(itemId: string) => {
      return await api.delete<TResponse>(`/api/items/${itemId}`);
    },
  },

  // Health check
  healthCheck: async <TResponse = unknown>() => {
    return await api.get<TResponse>("/health");
  },
};

// Generic API function helper
export async function callAPI<TRequest, TResponse>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
  data?: TRequest
): Promise<TResponse> {
  switch (method) {
    case "GET":
      return await api.get<TResponse>(endpoint);
    case "POST":
      return await api.post<TResponse>(endpoint, data);
    case "PUT":
      return await api.put<TResponse>(endpoint, data);
    case "DELETE":
      return await api.delete<TResponse>(endpoint);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

// Backward compatibility helper for legacy function names
export async function callFunction<TRequest, TResponse>(
  functionName: string,
  data: TRequest
): Promise<TResponse> {
  // Map legacy function names to API endpoints
  const endpointMap: { [key: string]: string } = {
    exampleFunction: "/api/example",
    getUserProfile: "/api/users/profile",
    createItem: "/api/items",
    // Add more mappings as needed
  };
  
  const endpoint = endpointMap[functionName] || `/api/${functionName}`;
  return await callAPI<TRequest, TResponse>(endpoint, "POST", data);
}

// Export commonly used functions for easy access
export const { users, items, healthCheck } = apiFunctions;
