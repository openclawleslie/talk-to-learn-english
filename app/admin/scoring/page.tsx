"use client";

import { useState, useEffect } from "react";
import { Star, Save, AlertCircle } from "lucide-react";

interface ScoringConfig {
  oneStarMax: number;
  twoStarMax: number;
}

export default function AdminScoringPage() {
  const [config, setConfig] = useState<ScoringConfig>({
    oneStarMax: 70,
    twoStarMax: 84,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/scoring-config");
      if (response.ok) {
        const data = await response.json();
        if (data.data.config) {
          setConfig(data.data.config);
        }
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (config.oneStarMax >= config.twoStarMax) {
      setMessage("一星最大值必須小於兩星最大值");
      return;
    }

    if (config.oneStarMax < 0 || config.twoStarMax > 100) {
      setMessage("分數必須在0-100之間");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/scoring-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage("設定儲存成功！");
      } else {
        const data = await response.json();
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || "儲存失敗");
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">評分設定</h1>
        <p className="text-base-content/60 mt-2">設定AI評分的星級門檻</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`alert ${
            message.includes("成功") ? "alert-success" : "alert-error"
          }`}
        >
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}

      {/* Configuration Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">星級門檻設定</h2>

          {/* Visual Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            {/* One Star */}
            <div className="card bg-error/10 border-2 border-error/30">
              <div className="card-body items-center text-center">
                <Star className="h-12 w-12 text-error fill-error" />
                <h3 className="font-bold text-lg">一星</h3>
                <p className="text-2xl font-mono">
                  0 - {config.oneStarMax}
                </p>
                <p className="text-sm opacity-60">需要加油</p>
              </div>
            </div>

            {/* Two Stars */}
            <div className="card bg-warning/10 border-2 border-warning/30">
              <div className="card-body items-center text-center">
                <div className="flex gap-1">
                  <Star className="h-12 w-12 text-warning fill-warning" />
                  <Star className="h-12 w-12 text-warning fill-warning" />
                </div>
                <h3 className="font-bold text-lg">兩星</h3>
                <p className="text-2xl font-mono">
                  {config.oneStarMax + 1} - {config.twoStarMax}
                </p>
                <p className="text-sm opacity-60">表現良好</p>
              </div>
            </div>

            {/* Three Stars */}
            <div className="card bg-success/10 border-2 border-success/30">
              <div className="card-body items-center text-center">
                <div className="flex gap-1">
                  <Star className="h-12 w-12 text-success fill-success" />
                  <Star className="h-12 w-12 text-success fill-success" />
                  <Star className="h-12 w-12 text-success fill-success" />
                </div>
                <h3 className="font-bold text-lg">三星</h3>
                <p className="text-2xl font-mono">
                  {config.twoStarMax + 1} - 100
                </p>
                <p className="text-sm opacity-60">表現優秀</p>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Input Fields */}
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  一星最大值（不包含此值）
                </span>
                <span className="label-text-alt">低於此分數為一星</span>
              </label>
              <input
                type="number"
                value={config.oneStarMax}
                onChange={(e) =>
                  setConfig({ ...config, oneStarMax: parseInt(e.target.value) })
                }
                className="input input-bordered"
                min={0}
                max={99}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  兩星最大值（不包含此值）
                </span>
                <span className="label-text-alt">
                  {config.oneStarMax + 1} 至此分數為兩星
                </span>
              </label>
              <input
                type="number"
                value={config.twoStarMax}
                onChange={(e) =>
                  setConfig({ ...config, twoStarMax: parseInt(e.target.value) })
                }
                className="input input-bordered"
                min={1}
                max={100}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="alert alert-info mt-4">
            <AlertCircle className="h-5 w-5" />
            <div className="text-sm">
              <p className="font-semibold">計算規則：</p>
              <ul className="list-disc list-inside mt-1">
                <li>
                  一星：分數 ≤ {config.oneStarMax}
                </li>
                <li>
                  兩星：{config.oneStarMax} &lt; 分數 ≤ {config.twoStarMax}
                </li>
                <li>三星：分數 &gt; {config.twoStarMax}</li>
              </ul>
            </div>
          </div>

          {/* Save Button */}
          <div className="card-actions justify-end mt-6">
            <button
              onClick={handleSave}
              className="btn btn-primary gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  儲存中...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  儲存設定
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
