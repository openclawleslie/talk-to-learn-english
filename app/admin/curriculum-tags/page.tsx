"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";

interface CurriculumTag {
  id: string;
  name: string;
  description: string;
}

export default function AdminCurriculumTagsPage() {
  const [tags, setTags] = useState<CurriculumTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/curriculum-tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data.data.curriculumTags || []);
      }
    } catch (error) {
      console.error("Failed to fetch curriculum tags:", error);
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
        ? `/api/admin/curriculum-tags/${editingId}`
        : "/api/admin/curriculum-tags";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(editingId ? "標籤更新成功！" : "標籤建立成功！");
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: "", description: "" });
        fetchTags();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || (editingId ? "更新失敗" : "建立失敗"));
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tag: CurriculumTag) => {
    setEditingId(tag.id);
    setFormData({
      name: tag.name,
      description: tag.description,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個標籤嗎？")) return;

    try {
      const response = await fetch(`/api/admin/curriculum-tags/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("刪除成功");
        fetchTags();
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
          <h1 className="text-3xl font-bold">課綱標籤管理</h1>
          <p className="text-base-content/60 mt-2">管理所有課綱標籤資訊</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "" });
            setShowModal(true);
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-5 w-5" />
          建立標籤
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

      {/* Tags Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : tags.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <Tag className="h-16 w-16 mx-auto text-base-content/40 mb-4" />
            <p className="text-base-content/60">目前沒有標籤，點擊上方按鈕建立</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <div key={tag.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <h2 className="card-title">{tag.name}</h2>
                {tag.description && (
                  <p className="text-sm text-base-content/60">{tag.description}</p>
                )}
                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={() => handleEdit(tag)}
                    className="btn btn-sm btn-ghost gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="btn btn-sm btn-ghost text-error gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? "編輯標籤" : "建立標籤"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">標籤名稱</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input input-bordered w-full"
                  placeholder="例如：國小英語課綱 - 聽力"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">描述</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="textarea textarea-bordered w-full"
                  placeholder="例如：Elementary school English curriculum - Listening comprehension"
                  rows={3}
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: "", description: "" });
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
                  {isSubmitting ? (
                    <span className="loading loading-spinner" />
                  ) : editingId ? (
                    "更新"
                  ) : (
                    "建立"
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
        </div>
      )}
    </div>
  );
}
