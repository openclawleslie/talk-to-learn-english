"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Class {
  id: number;
  name: string;
  timezone: string;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    timezone: "Asia/Shanghai",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/classes");
      if (response.ok) {
        const data = await response.json();
        setClasses(data.data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const url = editingId
        ? `/api/admin/classes/${editingId}`
        : "/api/admin/classes";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(editingId ? "班級更新成功！" : "班級建立成功！");
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: "", timezone: "Asia/Shanghai" });
        fetchClasses();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || (editingId ? "更新失敗" : "建立失敗"));
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingId(cls.id);
    setFormData({
      name: cls.name,
      timezone: cls.timezone,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這個班級嗎？")) return;

    try {
      const response = await fetch(`/api/admin/classes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("刪除成功");
        fetchClasses();
      } else {
        setMessage("刪除失敗");
      }
    } catch (error) {
      setMessage("網路錯誤");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">班級管理</h1>
          <p className="text-base-content/60 mt-2">管理所有班級資訊</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", timezone: "Asia/Shanghai" });
            setShowModal(true);
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-5 w-5" />
          建立班級
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="alert alert-info">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}

      {/* Classes List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/60">目前沒有班級，點擊上方按鈕建立</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>班級名稱</th>
                    <th>時區</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td>{cls.id}</td>
                      <td className="font-semibold">{cls.name}</td>
                      <td>{cls.timezone}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(cls)}
                            className="btn btn-sm btn-ghost"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            className="btn btn-sm btn-ghost text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? "編輯班級" : "建立新班級"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">班級名稱</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例如：一年級A班"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">時區</span>
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  className="select select-bordered"
                >
                  <option value="Asia/Shanghai">Asia/Shanghai</option>
                  <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: "", timezone: "Asia/Shanghai" });
                  }}
                  className="btn"
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (editingId ? "更新中..." : "建立中...") : (editingId ? "更新" : "建立")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
