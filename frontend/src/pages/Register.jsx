import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../api/auth";

export default function Register() {

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);
    setError("");

    try {

      await registerUser(
        name,
        email,
        password,
        "patient"
      );

      navigate("/login");

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Registration failed"
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        <div className="mb-8">

          <h1 className="text-3xl font-bold">
            Create account
          </h1>

          <p className="text-gray-500 mt-2">
            Create your pharmacy account
          </p>

        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <div>

            <label className="block text-sm font-medium mb-2">
              Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
            />

          </div>

          <div>

            <label className="block text-sm font-medium mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="patient@example.com"
            />

          </div>

          <div>

            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Creating account..."
              : "Create account"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-500">

          Already have an account?{" "}

          <Link
            to="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Sign in
          </Link>

        </p>

      </div>

    </div>
  );
}