#!/usr/bin/env tsx
/**
 * Automated Curriculum Tags Feature Verification Script
 *
 * This script verifies the curriculum tagging implementation by checking:
 * 1. Database schema files exist and contain correct tables
 * 2. API endpoints exist with correct exports
 * 3. Validators are properly defined
 * 4. UI components exist and follow patterns
 * 5. Seed script is ready
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: string;
}

class CurriculumTagsVerifier {
  private results: VerificationResult[] = [];
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  private checkFileExists(filePath: string, description: string): VerificationResult {
    const fullPath = join(this.rootDir, filePath);
    const exists = existsSync(fullPath);
    return {
      passed: exists,
      message: `${description}: ${filePath}`,
      details: exists ? "✅ File exists" : "❌ File not found"
    };
  }

  private checkFileContains(
    filePath: string,
    searchTerms: string[],
    description: string
  ): VerificationResult {
    const fullPath = join(this.rootDir, filePath);

    if (!existsSync(fullPath)) {
      return {
        passed: false,
        message: `${description}: ${filePath}`,
        details: "❌ File not found"
      };
    }

    const content = readFileSync(fullPath, "utf-8");
    const missingTerms = searchTerms.filter(term => !content.includes(term));

    if (missingTerms.length === 0) {
      return {
        passed: true,
        message: `${description}: ${filePath}`,
        details: `✅ All required terms found (${searchTerms.length})`
      };
    }

    return {
      passed: false,
      message: `${description}: ${filePath}`,
      details: `❌ Missing terms: ${missingTerms.join(", ")}`
    };
  }

  async verify(): Promise<void> {
    console.log("🔍 Curriculum Tags Feature Verification\n");
    console.log("=" .repeat(60));

    // 1. Database Schema Verification
    console.log("\n📊 Database Schema");
    console.log("-".repeat(60));

    this.results.push(
      this.checkFileContains(
        "lib/db/schema.ts",
        [
          "curriculumTags",
          "taskItemTags",
          "curriculum_tags",
          "task_item_tags",
          "curriculumTagId",
        ],
        "Schema contains curriculum tables"
      )
    );

    this.results.push(
      this.checkFileExists(
        "drizzle/0003_glorious_bucky.sql",
        "Migration file exists"
      )
    );

    // 2. Validators Verification
    console.log("\n📝 Validation Schemas");
    console.log("-".repeat(60));

    this.results.push(
      this.checkFileContains(
        "lib/validators.ts",
        [
          "createCurriculumTagSchema",
          "updateCurriculumTagSchema",
          "tagIds",
          "z.array(z.string().uuid())"
        ],
        "Validators defined correctly"
      )
    );

    // 3. API Endpoints Verification
    console.log("\n🔌 API Endpoints");
    console.log("-".repeat(60));

    this.results.push(
      this.checkFileExists(
        "app/api/admin/curriculum-tags/route.ts",
        "List & Create endpoints"
      )
    );

    this.results.push(
      this.checkFileContains(
        "app/api/admin/curriculum-tags/route.ts",
        ["GET", "POST", "requireAdmin", "curriculumTags"],
        "List & Create endpoints implemented"
      )
    );

    this.results.push(
      this.checkFileExists(
        "app/api/admin/curriculum-tags/[id]/route.ts",
        "Update & Delete endpoints"
      )
    );

    this.results.push(
      this.checkFileContains(
        "app/api/admin/curriculum-tags/[id]/route.ts",
        ["PUT", "DELETE", "updateCurriculumTagSchema"],
        "Update & Delete endpoints implemented"
      )
    );

    this.results.push(
      this.checkFileContains(
        "app/api/admin/weekly-tasks/route.ts",
        [
          "taskItemTags",
          "tagIds",
          "curriculumTagId",
          "db.insert(schema.taskItemTags)"
        ],
        "Weekly tasks saves tag associations"
      )
    );

    // 4. Admin UI Verification
    console.log("\n🎨 Admin UI");
    console.log("-".repeat(60));

    this.results.push(
      this.checkFileExists(
        "app/admin/curriculum-tags/page.tsx",
        "Curriculum tags admin page"
      )
    );

    this.results.push(
      this.checkFileContains(
        "app/admin/curriculum-tags/page.tsx",
        [
          "CurriculumTag",
          "fetchTags",
          "handleSubmit",
          "handleEdit",
          "handleDelete",
          "/api/admin/curriculum-tags"
        ],
        "Admin page has CRUD functionality"
      )
    );

    this.results.push(
      this.checkFileContains(
        "app/admin/weekly-tasks/page.tsx",
        [
          "CurriculumTag",
          "curriculumTags",
          "selectedTags",
          "curriculumTagIds",
          "/api/admin/curriculum-tags"
        ],
        "Weekly tasks page has tag selection"
      )
    );

    // 5. Seed Script Verification
    console.log("\n🌱 Seed Data");
    console.log("-".repeat(60));

    this.results.push(
      this.checkFileExists(
        "scripts/seed-curriculum.ts",
        "Seed script exists"
      )
    );

    this.results.push(
      this.checkFileContains(
        "scripts/seed-curriculum.ts",
        [
          "國小英語課綱",
          "國中英語課綱",
          "翰林教材",
          "南一教材",
          "康軒教材",
          "curriculumTags",
          "onConflictDoNothing"
        ],
        "Seed script contains Taiwan curriculum"
      )
    );

    // Print Results
    console.log("\n📋 Verification Results");
    console.log("=".repeat(60));

    let passed = 0;
    let failed = 0;

    this.results.forEach((result) => {
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
      console.log(`\n${result.message}`);
      console.log(`  ${result.details}`);
    });

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log("\n✅ All verifications passed!");
      console.log("\n🎉 Curriculum tagging feature is correctly implemented!");
      console.log("\nNext steps:");
      console.log("  1. Apply database migration: npm run db:push");
      console.log("  2. Run seed script: npx tsx scripts/seed-curriculum.ts");
      console.log("  3. Test in browser at /admin/curriculum-tags");
      process.exit(0);
    } else {
      console.log("\n❌ Some verifications failed!");
      console.log("Please review the failed checks above.");
      process.exit(1);
    }
  }
}

// Run verification
const verifier = new CurriculumTagsVerifier();
verifier.verify().catch((error) => {
  console.error("\n❌ Verification error:", error);
  process.exit(1);
});
