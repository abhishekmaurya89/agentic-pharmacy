import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

export const uploadPrescription = async ({
  medicineName,
  validUntil,
  file,
}) => {
  const form = new FormData();
  form.append("medicine_name", medicineName);
  form.append("valid_until", validUntil);
  form.append("file", file);

  const response = await API.post("/prescriptions/upload", form, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  });

  return response.data;
};
