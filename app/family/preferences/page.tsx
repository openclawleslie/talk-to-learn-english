"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, BellOff, Loader2, CheckCircle } from "lucide-react";

function PreferencesContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/family/notification-preferences?token=${encodeURIComponent(token)}`
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "無法載入偏好設定");
        return;
      }
      setEmailEnabled(json.data.emailEnabled);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("缺少存取權杖");
      setIsLoading(false);
      return;
    }
    fetchPreferences();
  }, [token, fetchPreferences]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/family/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, emailEnabled }),
      });

      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "儲存失敗");
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/family/tasks?token=${encodeURIComponent(token)}`}
            className="inline-flex items-center text-indigo-700 hover:text-indigo-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回任務清單
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="h-8 w-8 text-indigo-600" />
            通知偏好設定
          </h1>
          <p className="text-gray-600 mt-2">管理您的電子郵件通知設定</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              設定已成功儲存
            </div>
          )}

          {/* Email Notification Toggle */}
          <div className="mb-6">
            <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {emailEnabled ? (
                    <Bell className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <BellOff className="h-5 w-5 text-gray-400" />
                  )}
                  <h3 className="font-semibold text-gray-800">
                    電子郵件通知
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  當新的每週任務發布時，透過電子郵件通知您
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                  ${emailEnabled ? "bg-indigo-600" : "bg-gray-200"}
                `}
                role="switch"
                aria-checked={emailEnabled}
              >
                <span className="sr-only">啟用電子郵件通知</span>
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    ${emailEnabled ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">📧 關於電子郵件通知</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 當老師發布新的每週任務時，您會收到電子郵件</li>
              <li>• 電子郵件包含任務詳情和直接連結到家長入口網站</li>
              <li>• 您可以隨時在此頁面變更此設定</li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`
                px-6 py-3 rounded-lg font-semibold text-white transition-all
                ${
                  isSaving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
                }
                flex items-center gap-2
              `}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  儲存中...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  儲存設定
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>如有任何問題，請聯絡您孩子的老師</p>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <PreferencesContent />
    </Suspense>
  );
}
