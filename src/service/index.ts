import { API_URL } from "@/constants/url";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

export const getApiCall = async (endpoint: string) => {
  try {
    const token = getFromStorage(STORAGE_KEYS.token);
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "x-portal": "USER",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/${endpoint}`.replace(/([^:]\/)\/+/g, "$1"), {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Something went wrong");
    }

    return await response.json();
  } catch (error) {
    console.error("API Call Error:", error);
    throw error;
  }
};
