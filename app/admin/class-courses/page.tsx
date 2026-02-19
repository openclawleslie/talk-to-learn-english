"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";

interface Class {
  id: string;
  name: string;
  timezone: string;
}

interface Course {
  id: string;
  name: string;
  level: string;
}

interface ClassCourse {
  id: string;
  class_id: string;
  course_id: string;
  class_name: string;
  course_name: string;
}

export default function AdminClassCoursesPage() {
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    classId: "",
    courseId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [ccRes, classesRes, coursesRes] = await Promise.all([
        fetch("/api/admin/class-courses"),
        fetch("/api/admin/classes"),
        fetch("/api/admin/courses"),
      ]);

      if (ccRes.ok) {
        const data = await ccRes.json();
        setClassCourses(data.data.classCourses || []);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.data.classes || []);
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.data.courses || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.courseId) {
      setMessage("請選擇班級和課程");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/class-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("班級課程關聯成功！");
        setShowModal(false);
        setFormData({ classId: "", courseId: "" });
        fetchData();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || "建立失敗");
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個班級課程關聯嗎？")) return;

    try {
      const response = await fetch(`/api/admin/class-courses/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("刪除成功");
        fetchData();
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
          <h1 className="text-3xl font-bold">班級課程管理</h1>
          <p className="text-base-content/60 mt-2">管理班級和課程的關聯關係</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-5 w-5" />
          新增關聯
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

      {/* Info Card */}
      <div className="alert alert-info">
        <LinkIcon className="h-5 w-5" />
        <div className="text-sm">
          <p className="font-semibold">關聯說明：</p>
          <ul className="list-disc list-inside mt-1">
            <li>先建立班級和課程後，才能建立關聯</li>
            <li>一個班級可以有多門課程</li>
            <li>一門課程可以在多個班級開設</li>
            <li>老師將被分配到具體的「班級-課程」組合</li>
          </ul>
        </div>
      </div>

      {/* Class Courses List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : classCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/60">目前沒有班級課程關聯，點擊上方按鈕新增</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>班級</th>
                    <th>課程</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {classCourses.map((cc) => (
                    <tr key={cc.id}>
                      <td className="font-mono text-xs">{cc.id.slice(0, 8)}...</td>
                      <td>
                        <span className="badge badge-primary badge-lg">
                          {cc.class_name}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-secondary badge-lg">
                          {cc.course_name}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(cc.id)}
                          className="btn btn-sm btn-ghost text-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
            <h3 className="font-bold text-lg mb-4">新增班級課程關聯</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">選擇班級</span>
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) =>
                    setFormData({ ...formData, classId: e.target.value })
                  }
                  className="select select-bordered"
                  required
                >
                  <option value="">請選擇班級</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">選擇課程</span>
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) =>
                    setFormData({ ...formData, courseId: e.target.value })
                  }
                  className="select select-bordered"
                  required
                >
                  <option value="">請選擇課程</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {isSubmitting ? "建立中..." : "建立"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
