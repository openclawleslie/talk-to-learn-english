import { desc, eq, inArray } from "drizzle-orm";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireTeacher();

    // Get teacher's assigned class courses
    const assignments = await db
      .select({ classCourseId: schema.teacherAssignments.classCourseId })
      .from(schema.teacherAssignments)
      .where(eq(schema.teacherAssignments.teacherId, session.teacherId));

    if (!assignments.length) {
      return ok({ weeklyTasks: [] });
    }

    const classCourseIds = assignments.map((a) => a.classCourseId);

    // Get class course details with class and course names
    const classCourses = await db
      .select({
        id: schema.classCourses.id,
        classId: schema.classCourses.classId,
        courseId: schema.classCourses.courseId,
      })
      .from(schema.classCourses)
      .where(inArray(schema.classCourses.id, classCourseIds));

    // Get class names
    const classIds = [...new Set(classCourses.map((cc) => cc.classId))];
    const classes = classIds.length
      ? await db
          .select({ id: schema.classes.id, name: schema.classes.name })
          .from(schema.classes)
          .where(inArray(schema.classes.id, classIds))
      : [];
    const classMap = new Map(classes.map((c) => [c.id, c.name]));

    // Get course names
    const courseIds = [...new Set(classCourses.map((cc) => cc.courseId))];
    const courses = courseIds.length
      ? await db
          .select({ id: schema.courses.id, name: schema.courses.name })
          .from(schema.courses)
          .where(inArray(schema.courses.id, courseIds))
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c.name]));

    // Build classCourse info map
    const classCourseMap = new Map(
      classCourses.map((cc) => [
        cc.id,
        {
          className: classMap.get(cc.classId) || "",
          courseName: courseMap.get(cc.courseId) || "",
        },
      ])
    );

    // Get weekly tasks for these class courses
    const weeklyTasks = await db
      .select({
        id: schema.weeklyTasks.id,
        classCourseId: schema.weeklyTasks.classCourseId,
        weekStart: schema.weeklyTasks.weekStart,
        weekEnd: schema.weeklyTasks.weekEnd,
        status: schema.weeklyTasks.status,
      })
      .from(schema.weeklyTasks)
      .where(inArray(schema.weeklyTasks.classCourseId, classCourseIds))
      .orderBy(desc(schema.weeklyTasks.weekStart));

    // Get task items for each weekly task
    const taskIds = weeklyTasks.map((t) => t.id);
    const taskItems = taskIds.length
      ? await db
          .select({
            weeklyTaskId: schema.taskItems.weeklyTaskId,
            orderIndex: schema.taskItems.orderIndex,
            sentenceText: schema.taskItems.sentenceText,
            audioUrl: schema.taskItems.referenceAudioUrl,
          })
          .from(schema.taskItems)
          .where(inArray(schema.taskItems.weeklyTaskId, taskIds))
      : [];

    const taskItemsMap = new Map<string, typeof taskItems>();
    for (const item of taskItems) {
      const existing = taskItemsMap.get(item.weeklyTaskId) || [];
      existing.push(item);
      taskItemsMap.set(item.weeklyTaskId, existing);
    }

    // Calculate week number from weekStart
    const getWeekNumber = (weekStart: Date) => {
      const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
      const diff = weekStart.getTime() - startOfYear.getTime();
      return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
    };

    const result = weeklyTasks.map((task) => {
      const ccInfo = classCourseMap.get(task.classCourseId);
      return {
        id: task.id,
        classCourseId: task.classCourseId,
        className: ccInfo?.className || "",
        courseName: ccInfo?.courseName || "",
        weekNumber: getWeekNumber(task.weekStart),
        startDate: task.weekStart.toISOString(),
        endDate: task.weekEnd.toISOString(),
        status: task.status,
        items: (taskItemsMap.get(task.id) || []).sort((a, b) => a.orderIndex - b.orderIndex),
      };
    });

    return ok({ weeklyTasks: result });
  } catch (error) {
    return fromError(error);
  }
}
