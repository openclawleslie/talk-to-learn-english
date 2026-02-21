import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const familyLinkStatusEnum = pgEnum("family_link_status", ["active", "revoked"]);
export const weeklyTaskStatusEnum = pgEnum("weekly_task_status", ["draft", "published"]);
export const audioStatusEnum = pgEnum("reference_audio_status", ["pending", "ready", "failed"]);
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

export const teachers = pgTable(
  "teachers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("teacher_email_unique").on(t.email)],
);

export const adminConfig = pgTable("admin_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  scoringThresholds: jsonb("scoring_thresholds_json")
    .$type<{ oneStarMax: number; twoStarMax: number }>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  timezone: varchar("timezone", { length: 80 }).notNull().default("Asia/Shanghai"),
});

export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  level: varchar("level", { length: 80 }).notNull(),
});

export const classCourses = pgTable(
  "class_courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("class_course_unique").on(t.classId, t.courseId)],
);

export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    classCourseId: uuid("class_course_id")
      .notNull()
      .references(() => classCourses.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("teacher_assignment_unique").on(t.teacherId, t.classCourseId)],
);

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentName: varchar("parent_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }),
  note: text("note").notNull().default(""),
  classCourseId: uuid("class_course_id")
    .notNull()
    .references(() => classCourses.id, { onDelete: "cascade" }),
  createdByTeacherId: uuid("created_by_teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const familyLinks = pgTable(
  "family_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    tokenHmac: text("token_hmac"),
    status: familyLinkStatusEnum("status").notNull().default("active"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("family_links_token_hmac_idx").on(t.tokenHmac)],
);

export const weeklyTasks = pgTable(
  "weekly_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classCourseId: uuid("class_course_id")
      .notNull()
      .references(() => classCourses.id, { onDelete: "cascade" }),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    weekEnd: timestamp("week_end", { withTimezone: true }).notNull(),
    status: weeklyTaskStatusEnum("status").notNull().default("draft"),
    createdByAdmin: uuid("created_by_admin")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
  },
  (t) => [uniqueIndex("weekly_task_unique").on(t.classCourseId, t.weekStart)],
);

export const taskItems = pgTable(
  "task_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weeklyTaskId: uuid("weekly_task_id")
      .notNull()
      .references(() => weeklyTasks.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    sentenceText: text("sentence_text").notNull(),
    referenceAudioUrl: text("reference_audio_url"),
    referenceAudioStatus: audioStatusEnum("reference_audio_status").notNull().default("pending"),
  },
  (t) => [uniqueIndex("task_item_order_unique").on(t.weeklyTaskId, t.orderIndex)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    taskItemId: uuid("task_item_id")
      .notNull()
      .references(() => taskItems.id, { onDelete: "cascade" }),
    audioUrl: text("audio_url").notNull(),
    transcript: text("transcript").notNull(),
    score: integer("score").notNull(),
    stars: integer("stars").notNull(),
    feedback: text("feedback").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("submission_student_task_unique").on(t.studentId, t.taskItemId)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("notification_preferences_family_unique").on(t.familyId)],
);

export const taskNotifications = pgTable("task_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  weeklyTaskId: uuid("weekly_task_id")
    .notNull()
    .references(() => weeklyTasks.id, { onDelete: "cascade" }),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  status: notificationStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
