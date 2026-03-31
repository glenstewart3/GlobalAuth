import { useCallback } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export function useApi() {
  const { accessToken, API } = useAuth();

  const request = useCallback(
    async (method, path, data = null, params = null) => {
      const config = {
        method,
        url: `${API}${path}`,
        withCredentials: true,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      };
      if (data !== null) config.data = data;
      if (params !== null) config.params = params;
      return axios(config);
    },
    [accessToken, API]
  );

  return { request, API };
}
