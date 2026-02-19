"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, UserCheck, UserX, Key } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  classCourseNames: string[];
}

interface ClassCourse {
  id: string;
  class_id: string;
  course_id: string;
  class_name: string | null;
  course_name: string | null;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    classCourseIds: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTeachers();
    fetchClassCourses();
  }, []);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/teacher");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.data.teachers || []);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassCourses = async () => {
    try {
      const response = await fetch("/api/admin/class-courses");
      if (response.ok) {
        const data = await response.json();
        setClassCourses(data.data.classCourses || []);
      }
    } catch (error) {
      console.error("Failed to fetch class courses:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const url = editingId ? `/api/admin/teacher/${editingId}` : "/api/admin/teacher";
      const method = editingId ? "PUT" : "POST";

      const body = editingId
        ? { name: formData.name, email: formData.email, classCourseIds: formData.classCourseIds }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(editingId ? "老師更新成功！" : "老師建立成功！");
        setShowModal(false);
        setFormData({ name: "", email: "", password: "", classCourseIds: [] });
        setEditingId(null);
        fetchTeachers();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || (editingId ? "更新失敗" : "建立失敗"));
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (teacher: Teacher) => {
    // Fetch teacher's assigned class courses
    try {
      const response = await fetch(`/api/admin/teacher/${teacher.id}/assignments`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: teacher.name,
          email: teacher.email,
          password: "",
          classCourseIds: (data.data.assignments?.map((a: any) => a.classCourseId) || []).filter(Boolean),
        });
      } else {
        setFormData({
          name: teacher.name,
          email: teacher.email,
          password: "",
          classCourseIds: [],
        });
      }
    } catch (error) {
      setFormData({
        name: teacher.name,
        email: teacher.email,
        password: "",
        classCourseIds: [],
      });
    }
    setEditingId(teacher.id);
    setShowModal(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/teacher/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        setMessage(isActive ? "老師已停用" : "老師已啟用");
        fetchTeachers();
      } else {
        setMessage("操作失敗");
      }
    } catch (error) {
      setMessage("網路錯誤");
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt("請輸入新密碼：");
    if (!newPassword) return;

    try {
      const response = await fetch(`/api/admin/teacher/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        setMessage("密碼重設成功");
      } else {
        setMessage("密碼重設失敗");
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
          <h1 className="text-3xl font-bold">老師管理</h1>
          <p className="text-base-content/60 mt-2">管理老師帳號和權限</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", email: "", password: "", classCourseIds: [] });
            setShowModal(true);
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-5 w-5" />
          建立老師
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

      {/* Teachers List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/60">目前沒有老師，點擊上方按鈕建立</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>姓名</th>
                    <th>電子郵件</th>
                    <th>班級課程</th>
                    <th>狀態</th>
                    <th>建立時間</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.id}</td>
                      <td className="font-semibold">{teacher.name}</td>
                      <td>{teacher.email}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {teacher.classCourseNames.length > 0
                            ? teacher.classCourseNames.map((name, i) => (
                                <span key={i} className="badge badge-outline badge-sm">{name}</span>
                              ))
                            : <span className="text-base-content/40 text-sm">未分配</span>}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            teacher.is_active ? "badge-success" : "badge-error"
                          }`}
                        >
                          {teacher.is_active ? "啟用" : "停用"}
                        </span>
                      </td>
                      <td>{new Date(teacher.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleActive(teacher.id, teacher.is_active)}
                            className="btn btn-sm btn-ghost tooltip"
                            data-tip={teacher.is_active ? "停用" : "啟用"}
                          >
                            {teacher.is_active ? (
                              <UserX className="h-4 w-4 text-error" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-success" />
                            )}
                          </button>
                          <button
                            onClick={() => handleResetPassword(teacher.id)}
                            className="btn btn-sm btn-ghost tooltip"
                            data-tip="重設密碼"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(teacher)}
                            className="btn btn-sm btn-ghost tooltip"
                            data-tip="編輯"
                          >
                            <Edit2 className="h-4 w-4" />
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

      {/* Create Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{editingId ? "編輯老師" : "建立新老師"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">姓名</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例如：張老師"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">電子郵件</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="teacher@example.com"
                  className="input input-bordered"
                  required
                />
              </div>

              {!editingId && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">初始密碼</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="至少6位"
                  className="input input-bordered"
                  required
                  minLength={6}
                />
              </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text">分配班級課程</span>
                  <span className="label-text-alt text-info">可多選</span>
                </label>
                <div className="border border-base-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-base-200">
                  {classCourses.length === 0 ? (
                    <p className="text-base-content/60 text-sm text-center py-4">
                      尚無班級課程，請先建立
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {classCourses.map((cc) => (
                        <label key={cc.id} className="flex items-center gap-2 cursor-pointer hover:bg-base-300 p-2 rounded">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            value={cc.id}
                            checked={formData.classCourseIds.includes(cc.id)}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData({
                                ...formData,
                                classCourseIds: e.target.checked
                                  ? [...formData.classCourseIds, value]
                                  : formData.classCourseIds.filter((id) => id !== value),
                              });
                            }}
                          />
                          <span className="text-sm">
                            {cc.class_name} - {cc.course_name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <label className="label">
                  <span className="label-text-alt">選擇老師負責的班級課程</span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: "", email: "", password: "", classCourseIds: [] });
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
