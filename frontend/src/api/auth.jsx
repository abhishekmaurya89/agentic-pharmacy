import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

export const loginUser = async (email, password) => {
  const response = await API.post("/auth/login", null, {
    params: {
      email,
      password,
    },
  });

  return response.data;
};

export const registerUser = async (
  name,
  email,
  password,
  role = "patient"
) => {
  const response = await API.post("/auth/register", {
    name,
    email,
    password,
    role,
  });

  return response.data;
};