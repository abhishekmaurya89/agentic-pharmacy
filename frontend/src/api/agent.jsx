import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export const sendAgentMessage = async (message, threadId = null) => {
  const params = {
    message,
  };

  if (threadId) {
    params.thread_id = threadId;
  }
  const response = await API.post(
    "/agent/chat",
    {},
    {
      params,
    },
  );

  return response.data;
};

export const confirmOrder = async (
  threadId,
  confirmed,
  approvalType = "order",
) => {
  const response = await API.post(
    "/agent/confirm",
    {},
    {
      params: {
        thread_id: threadId,
        confirmed,
        approval_type: approvalType,
      },
    },
  );

  return response.data;
};

export const getOrderStatus = async (threadId) => {
  const response = await API.get(`/orders/status/${threadId}`);

  return response.data;
};

export const getRefillPredictions = async () => {
  const response = await API.get("/refills/predictions");

  return response.data;
};
