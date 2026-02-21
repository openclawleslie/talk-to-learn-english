"use client";

import { useState, useEffect } from "react";
import { Plus, Link as LinkIcon, Copy, RefreshCw, Users, User, Edit } from "lucide-react";

interface Family {
  id: string;
  parentName: string;
  parentEmail: string | null;
  notificationPreference: string | null;
  note: string | null;
  classCourseId: string;
  className: string | null;
  courseName: string | null;
  createdAt: string;
  token: string | null;
  students: Array<{ id: string; name: string }>;
}

interface ClassCourse {
  id: string;
  class_name: string;
  course_name: string;
}

interface Student {
  id?: string;
  name: string;
}

export default function TeacherFamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [formData, setFormData] = useState({
    parentName: "",
    parentEmail: "",
    notificationPreference: "none",
    note: "",
    classCourseId: "",
    students: [{ name: "" }] as Student[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [familiesRes, ccRes] = await Promise.all([
        fetch("/api/teacher/families"),
        fetch("/api/teacher/class-courses"),
      ]);

      if (familiesRes.ok) {
        const data = await familiesRes.json();
        setFamilies(data.data.families || []);
      }
      if (ccRes.ok) {
        const data = await ccRes.json();
        setClassCourses(data.data.classCourses || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setGeneratedLink("");

    try {
      if (editingFamily) {
        // 编辑模式
        const response = await fetch(`/api/teacher/families/${editingFamily.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentName: formData.parentName,
            parentEmail: formData.parentEmail,
            notificationPreference: formData.notificationPreference,
            note: formData.note,
            students: formData.students,
          }),
        });

        if (response.ok) {
          setMessage("家庭資訊更新成功！");
          setShowModal(false);
          fetchData();
        } else {
          const data = await response.json();
          setMessage(
            typeof data.error === "string"
              ? data.error
              : data.error?.message || "更新失敗"
          );
        }
      } else {
        // 创建模式
        const response = await fetch("/api/teacher/families", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          const token = data.data.token;
          const link = `${window.location.origin}/family/${token}`;
          setGeneratedLink(link);
          setMessage("家庭建立成功！");
          setShowModal(false);
          fetchData();
        } else {
          setMessage(
            typeof data.error === "string"
              ? data.error
              : data.error?.message || "建立失敗"
          );
        }
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStudent = () => {
    setFormData({
      ...formData,
      students: [...formData.students, { name: "" }],
    });
  };

  const removeStudent = (index: number) => {
    setFormData({
      ...formData,
      students: formData.students.filter((_, i) => i !== index),
    });
  };

  const updateStudent = (index: number, name: string) => {
    const newStudents = [...formData.students];
    newStudents[index] = { ...newStudents[index], name };
    setFormData({ ...formData, students: newStudents });
  };

  const handleEdit = (family: Family) => {
    setEditingFamily(family);
    setFormData({
      parentName: family.parentName,
      parentEmail: family.parentEmail || "",
      notificationPreference: family.notificationPreference || "none",
      note: family.note || "",
      classCourseId: family.classCourseId,
      students: family.students.map((s) => ({ id: s.id, name: s.name })),
    });
    setGeneratedLink("");
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingFamily(null);
    setFormData({
      parentName: "",
      parentEmail: "",
      notificationPreference: "none",
      note: "",
      classCourseId: "",
      students: [{ name: "" }],
    });
    setGeneratedLink("");
    setShowModal(true);
  };

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  };

  const copyLink = async () => {
    const copied = await copyText(generatedLink);
    setMessage(copied ? "連結已複製到剪貼簿！" : "複製失敗，請手動複製");
  };

  const copyFamilyLink = async (token: string | null) => {
    if (!token) {
      setMessage("此家庭尚無有效連結，請點擊「重設連結」產生新連結");
      return;
    }

    const link = `${window.location.origin}/family/${token}`;
    const copied = await copyText(link);
    setMessage(copied ? "連結已複製到剪貼簿！" : "複製失敗，請手動複製");
  };

  const handleResetLink = async (familyId: string) => {
    if (!confirm("確定要重設此家庭的存取連結嗎？舊連結將失效。")) return;

    try {
      const response = await fetch(
        `/api/teacher/families/${familyId}/reset-link`,
        { method: "POST" }
      );

      if (response.ok) {
        const data = await response.json();
        const token = data.data.token;
        const link = `${window.location.origin}/family/${token}`;
        setGeneratedLink(link);
        setMessage("連結重設成功！");
      } else {
        setMessage("重設失敗");
      }
    } catch (error) {
      setMessage("網路錯誤");
    }
  };

  // Group families by class course
  const groupedFamilies = families.reduce((acc, family) => {
    const key = family.classCourseId;
    if (!acc[key]) {
      acc[key] = {
        classCourseId: family.classCourseId,
        className: family.className || "未知班級",
        courseName: family.courseName || "未知課程",
        families: [],
      };
    }
    acc[key].families.push(family);
    return acc;
  }, {} as Record<string, { classCourseId: string; className: string; courseName: string; families: Family[] }>);

  const groupedList = Object.values(groupedFamilies).sort((a, b) =>
    a.className.localeCompare(b.className)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">家庭管理</h1>
          <p className="text-base-content/60 mt-2">
            建立家庭、新增學生、產生存取連結
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-5 w-5" />
          建立家庭
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

      {/* Generated Link Display */}
      {generatedLink && (
        <div className="alert alert-success">
          <LinkIcon className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-semibold">存取連結已產生：</p>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="input input-bordered input-sm flex-1 font-mono text-xs"
              />
              <button onClick={copyLink} className="btn btn-sm btn-ghost gap-1">
                <Copy className="h-4 w-4" />
                複製
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Families List */}
      <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : families.length === 0 ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-base-content/40 mb-4" />
                  <p className="text-base-content/60">
                    尚無家庭，點擊上方按鈕建立
                  </p>
                </div>
              </div>
            </div>
          ) : (
            groupedList.map((group) => (
              <div key={group.classCourseId} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-lg mb-3">
                    <Users className="h-5 w-5" />
                    {group.className} - {group.courseName}
                    <span className="badge badge-neutral badge-sm">{group.families.length} 個家庭</span>
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>家長姓名</th>
                          <th>學生</th>
                          <th>備註</th>
                          <th>建立時間</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.families.map((family) => (
                          <tr key={family.id}>
                            <td className="font-semibold">{family.parentName}</td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {family.students.map((student) => (
                                  <span key={student.id} className="badge badge-ghost badge-sm gap-1">
                                    <User className="h-3 w-3" />
                                    {student.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>{family.note || "-"}</td>
                            <td>
                              {new Date(family.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => handleEdit(family)}
                                  className="btn btn-sm btn-ghost gap-1"
                                  title="編輯"
                                >
                                  <Edit className="h-4 w-4" />
                                  編輯
                                </button>
                                <button
                                  onClick={() => copyFamilyLink(family.token)}
                                  className="btn btn-sm btn-primary gap-1"
                                  title="複製連結"
                                >
                                  <Copy className="h-4 w-4" />
                                  複製連結
                                </button>
                                <button
                                  onClick={() => handleResetLink(family.id)}
                                  className="btn btn-sm btn-ghost gap-1"
                                  title="重設連結"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  重設
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingFamily ? "編輯家庭資訊" : "建立新家庭"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">家長姓名</span>
                </label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) =>
                    setFormData({ ...formData, parentName: e.target.value })
                  }
                  placeholder="例如：張女士"
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">家長電子郵件</span>
                </label>
                <input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, parentEmail: e.target.value })
                  }
                  placeholder="例如：parent@example.com"
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">通知偏好</span>
                </label>
                <select
                  value={formData.notificationPreference}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationPreference: e.target.value })
                  }
                  className="select select-bordered"
                >
                  <option value="none">無通知</option>
                  <option value="email">電子郵件通知</option>
                  <option value="all">所有通知</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">選擇班級課程</span>
                </label>
                <select
                  value={formData.classCourseId}
                  onChange={(e) =>
                    setFormData({ ...formData, classCourseId: e.target.value })
                  }
                  className="select select-bordered"
                  required
                  disabled={!!editingFamily}
                >
                  <option value="">請選擇班級課程</option>
                  {classCourses.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.class_name} - {cc.course_name}
                    </option>
                  ))}
                </select>
                {editingFamily && (
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      編輯模式下無法更改班級課程
                    </span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">備註（選填）</span>
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="例如：週末班"
                  className="textarea textarea-bordered"
                  rows={2}
                />
              </div>

              <div className="divider">學生資訊</div>

              {formData.students.map((student, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="form-control flex-1">
                    <label className="label">
                      <span className="label-text">學生 {index + 1} 姓名</span>
                    </label>
                    <input
                      type="text"
                      value={student.name}
                      onChange={(e) => updateStudent(index, e.target.value)}
                      placeholder="例如：小明"
                      className="input input-bordered"
                      required
                    />
                  </div>
                  {formData.students.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStudent(index)}
                      className="btn btn-error btn-outline"
                    >
                      刪除
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addStudent}
                className="btn btn-outline btn-sm gap-1"
              >
                <Plus className="h-4 w-4" />
                新增學生
              </button>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setGeneratedLink("");
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
                  {isSubmitting
                    ? (editingFamily ? "儲存中..." : "建立中...")
                    : (editingFamily ? "儲存變更" : "建立並產生連結")
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
