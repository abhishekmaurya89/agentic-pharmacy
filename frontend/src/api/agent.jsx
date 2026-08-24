import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

export const sendAgentMessage = async (message) => {
  const token = localStorage.getItem("access_token");

  const response = await API.post(
    "/agent/chat",
    null,
    {
      params: {
        message,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
export const confirmOrder = async (
  threadId,
  confirmed
) => {
  const token = localStorage.getItem(
    "access_token"
  );

  const response = await API.post(
    "/agent/confirm",
    null,
    {
      params: {
        thread_id: threadId,
        confirmed,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};