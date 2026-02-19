"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, BookOpen } from "lucide-react";

interface Course {
  id: number;
  name: string;
  level: string;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    level: "beginner",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data.data.courses || []);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
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
        ? `/api/admin/courses/${editingId}`
        : "/api/admin/courses";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(editingId ? "課程更新成功！" : "課程建立成功！");
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: "", level: "beginner" });
        fetchCourses();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || (editingId ? "更新失敗" : "建立失敗"));
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setFormData({
      name: course.name,
      level: course.level,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這個課程嗎？")) return;

    try {
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("刪除成功");
        fetchCourses();
      } else {
        setMessage("刪除失敗");
      }
    } catch (error) {
      setMessage("網路錯誤");
    }
  };

  const getLevelBadge = (level: string) => {
    const badges: Record<string, string> = {
      beginner: "badge-success",
      intermediate: "badge-warning",
      advanced: "badge-error",
    };
    return badges[level] || "badge-neutral";
  };

  const getLevelText = (level: string) => {
    const texts: Record<string, string> = {
      beginner: "初級",
      intermediate: "中級",
      advanced: "高級",
    };
    return texts[level] || level;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">課程管理</h1>
          <p className="text-base-content/60 mt-2">管理所有課程資訊</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", level: "beginner" });
            setShowModal(true);
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-5 w-5" />
          建立課程
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

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : courses.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-base-content/40 mb-4" />
            <p className="text-base-content/60">目前沒有課程，點擊上方按鈕建立</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h2 className="card-title">{course.name}</h2>
                  <span className={`badge ${getLevelBadge(course.level)}`}>
                    {getLevelText(course.level)}
                  </span>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={() => handleEdit(course)}
                    className="btn btn-sm btn-ghost gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
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
              {editingId ? "編輯課程" : "建立新課程"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">課程名稱</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例如：英語口語基礎"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">難度級別</span>
                </label>
                <select
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value })
                  }
                  className="select select-bordered"
                >
                  <option value="beginner">初級 (Beginner)</option>
                  <option value="intermediate">中級 (Intermediate)</option>
                  <option value="advanced">高級 (Advanced)</option>
                </select>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: "", level: "beginner" });
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
