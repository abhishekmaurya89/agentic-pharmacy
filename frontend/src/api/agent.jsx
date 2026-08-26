import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const sendAgentMessage = async (message) => {
  const response = await API.post(
    "/agent/chat",
    {},
    {
      params: {
        message,
      },
    }
  );

  return response.data;
};
export const confirmOrder = async (
  threadId,
  confirmed,
  approvalType = "order"
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
    }
  );

  return response.data;
};