import { db, schema } from "@/lib/db/client";

async function main() {
  // Taiwan Elementary English Curriculum Standards (國小英語課綱)
  await db
    .insert(schema.curriculumTags)
    .values([
      {
        name: "國小英語課綱 - 聽力",
        description: "Elementary English Curriculum - Listening",
      },
      {
        name: "國小英語課綱 - 口說",
        description: "Elementary English Curriculum - Speaking",
      },
      {
        name: "國小英語課綱 - 文法",
        description: "Elementary English Curriculum - Grammar",
      },
      {
        name: "國小英語課綱 - 主題單元",
        description: "Elementary English Curriculum - Topic Units",
      },
    ])
    .onConflictDoNothing();

  // Taiwan Junior High English Curriculum Standards (國中英語課綱)
  await db
    .insert(schema.curriculumTags)
    .values([
      {
        name: "國中英語課綱 - 聽力",
        description: "Junior High English Curriculum - Listening",
      },
      {
        name: "國中英語課綱 - 口說",
        description: "Junior High English Curriculum - Speaking",
      },
      {
        name: "國中英語課綱 - 文法",
        description: "Junior High English Curriculum - Grammar",
      },
      {
        name: "國中英語課綱 - 主題單元",
        description: "Junior High English Curriculum - Topic Units",
      },
    ])
    .onConflictDoNothing();

  // Publisher Textbooks (各出版社教材章節)
  // Hanlin (翰林)
  await db
    .insert(schema.curriculumTags)
    .values([
      {
        name: "翰林教材 - Book 1",
        description: "Hanlin Textbook - Book 1",
      },
      {
        name: "翰林教材 - Book 2",
        description: "Hanlin Textbook - Book 2",
      },
      {
        name: "翰林教材 - Book 3",
        description: "Hanlin Textbook - Book 3",
      },
    ])
    .onConflictDoNothing();

  // Nani (南一)
  await db
    .insert(schema.curriculumTags)
    .values([
      {
        name: "南一教材 - Book 1",
        description: "Nani Textbook - Book 1",
      },
      {
        name: "南一教材 - Book 2",
        description: "Nani Textbook - Book 2",
      },
      {
        name: "南一教材 - Book 3",
        description: "Nani Textbook - Book 3",
      },
    ])
    .onConflictDoNothing();

  // Kang Hsuan (康軒)
  await db
    .insert(schema.curriculumTags)
    .values([
      {
        name: "康軒教材 - Book 1",
        description: "Kang Hsuan Textbook - Book 1",
      },
      {
        name: "康軒教材 - Book 2",
        description: "Kang Hsuan Textbook - Book 2",
      },
      {
        name: "康軒教材 - Book 3",
        description: "Kang Hsuan Textbook - Book 3",
      },
    ])
    .onConflictDoNothing();

  console.log("Curriculum tags seeded successfully");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
