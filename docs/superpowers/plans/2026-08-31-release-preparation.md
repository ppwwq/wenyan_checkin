# Release Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the locally completed 1.1.1 release for a clean, verified local Git commit without publishing it.

**Architecture:** Keep app source, learning assets, and release metadata in the repository. Remove only identified disposable extraction/audit artifacts, retain verification evidence in Git history, and preserve user-authored source changes.

**Tech Stack:** Flutter, Dart, Git, SQLite, JSON assets.

---

### Task 1: Fix static-analysis findings

**Files:**
- Modify: `lib/screens/stats_screen.dart`
- Modify: `lib/services/database_service.dart`

- [ ] Remove unnecessary string-interpolation braces and the redundant sqflite import.
- [ ] Run: `flutter analyze`
- [ ] Expected: `No issues found!`

### Task 2: Verify the release build

**Files:**
- Verify: `assets/seed_data/afterschool_reference.json`
- Verify: `assets/seed_data/dse_notes.json`

- [ ] Run: `flutter test -r expanded --timeout 30s`
- [ ] Expected: `All tests passed!`
- [ ] Run: `flutter build web`
- [ ] Expected: `Built build\\web`
- [ ] Confirm both assets occur in `build/web/assets/assets/seed_data/`.

### Task 3: Separate release files from disposable artifacts

**Files:**
- Modify: `.gitignore`
- Delete: explicitly identified extraction, audit, generated, and local-database artifacts only

- [ ] Add ignore rules for the known extraction/audit outputs and the local database.
- [ ] Delete only files already categorized as disposable in the project audit.
- [ ] Run: `git status --short`
- [ ] Expected: only release source, assets, metadata, and this plan remain.

### Task 4: Create a local release commit

**Files:**
- Commit: reviewed release files only

- [ ] Review staged file names and diff summary.
- [ ] Commit with: `feat: add DSE study references and quiz improvements`
- [ ] Run: `git status --short --branch`
- [ ] Expected: local `master` is one commit ahead of `origin/master` and has no working-tree changes.
