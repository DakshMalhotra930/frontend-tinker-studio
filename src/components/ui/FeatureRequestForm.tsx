import { useState } from "react";

export function FeatureRequestForm({ userEmail }) {
  const [featureText, setFeatureText] = useState("");
  const [status, setStatus] = useState(null);

  const submitRequest = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://praxis-ai.fly.dev'}/api/feature-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: userEmail, feature_text: featureText }),
      });
      if (response.status === 429) {
        // Specific error for rate limit exceeded
        setStatus("rate_limit");
        return;
      }
      if (!response.ok) throw new Error("Failed to submit request");
      setFeatureText("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex justify-center items-center w-full mt-8">
      <form
        onSubmit={submitRequest}
        className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-lg px-8 py-7 flex flex-col items-center"
      >
        <h3 className="text-xl font-semibold text-blue-200 mb-3 flex items-center gap-2">
          <span className="inline-block text-blue-400">💡</span>
          Suggest a feature!
        </h3>
        <label
          htmlFor="featureText"
          className="w-full text-sm font-medium text-gray-300 mb-2 text-left"
        >
          What would make this site better? (Your email is auto-attached)
        </label>
        <textarea
          id="featureText"
          rows={4}
          required
          disabled={status === "success"}
          placeholder="Share your feature idea, pain point, or suggestion..."
          className="w-full rounded-lg bg-gray-950 text-gray-100 p-3 mb-3 mt-1 resize-none placeholder-gray-400 focus:outline-none ring-2 ring-transparent focus:ring-blue-500 transition"
          value={featureText}
          onChange={(e) => setFeatureText(e.target.value)}
        />
        <button
          type="submit"
          disabled={status === "success" || featureText.length < 4}
          className={`w-full py-2 rounded-lg font-semibold text-lg transition ${
            status === "success"
              ? "bg-green-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          }`}
        >
          {status === "success" ? "Submitted!" : "Submit"}
        </button>
        {status === "success" && (
          <p className="text-green-400 text-center mt-2 animate-pulse">
            Thank you for your suggestion!
          </p>
        )}
        {status === "rate_limit" && (
          <p className="text-yellow-400 text-center mt-2">
            You can only submit one request every 15 minutes. Please try again later.
          </p>
        )}
        {status === "error" && (
          <p className="text-red-400 text-center mt-2">
            Submission failed. Please try again later.
          </p>
        )}
      </form>
    </div>
  );
}
