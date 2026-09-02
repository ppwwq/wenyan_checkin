# Wenyan Bug Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the confirmed startup, review-queue, answer-persistence, and calendar bugs while preserving existing app behavior.

**Architecture:** Keep the current Flutter/Provider/sqflite structure. Add narrow regression coverage at the service/provider/widget seams, migrate existing databases to restore question-to-annotation relationships, and serialize state-changing answer writes.

**Tech Stack:** Flutter, Dart, Provider, sqflite/sqflite_common_ffi, flutter_test.

**Status:** Implemented and verified. The final diff check was used instead of whole-repository formatting so the fix branch would not include unrelated formatting churn from pre-existing files.

---

### Task 1: Safe degraded startup

**Files:**
- Modify: `lib/main.dart`
- Test: `test/widget_test.dart`

- [ ] Add a widget test that pumps the app in explicit shell mode without providers and asserts a clear limited-functionality screen with no exception.
- [ ] Run `flutter test test/widget_test.dart` and confirm the new test fails because `MainScaffold` still reads missing providers.
- [ ] Pass shell mode into `WenyanApp` and render a provider-free startup error screen instead of `MainScaffold`.
- [ ] Re-run the focused widget test and confirm it passes.

### Task 2: Restore question-to-annotation identity

**Files:**
- Modify: `lib/services/database_service.dart`
- Modify: `lib/services/seed_service.dart`
- Modify: `lib/services/quiz_service.dart`
- Test: `test/services/database_service_test.dart`
- Create: `test/services/quiz_service_test.dart`

- [ ] Add tests proving schema v1 data is upgraded with `questions.annotation_id`, newly seeded/created relationships are retained, a due annotation yields its question, and reviewed annotations are excluded from new questions.
- [ ] Run the focused service tests and confirm they fail on the current null relationship and mismatched `question.id`/`annotation.id` comparison.
- [ ] Raise the schema version, add a deterministic migration that pairs each essay's ordered questions and annotations, and store inserted annotation IDs during fresh seeding.
- [ ] Change the new-question exclusion query to compare `questions.annotation_id` with annotation study-record target IDs.
- [ ] Re-run the focused service tests and confirm they pass.

### Task 3: Serialize answer persistence

**Files:**
- Modify: `lib/providers/quiz_provider.dart`
- Modify: `lib/screens/quiz_screen.dart`
- Modify: `lib/services/ebbinghaus_service.dart`
- Modify: `lib/services/streak_service.dart`
- Create: `test/providers/quiz_provider_test.dart`
- Extend: `test/services/ebbinghaus_service_test.dart`
- Create: `test/services/streak_service_test.dart`

- [ ] Add tests proving duplicate/in-flight submission is rejected, two concurrent question-count writes total two, and concurrent reviews preserve both increments.
- [ ] Run the focused tests and confirm the current read-modify-write behavior or provider state fails them.
- [ ] Add provider submission/answered state, await the complete persistence path in the screen, and expose retry feedback on failure.
- [ ] Replace daily count read-modify-write with a legacy-SQLite-compatible atomic insert/update, and wrap the complete answer write in one transaction.
- [ ] Re-run the focused tests and confirm they pass.

### Task 4: Load calendar months on demand and clear analysis findings

**Files:**
- Modify: `lib/providers/streak_provider.dart`
- Modify: `lib/screens/home_screen.dart`
- Modify: `lib/screens/stats_screen.dart`
- Modify: `lib/services/database_service.dart`
- Create: `test/providers/streak_provider_test.dart`

- [ ] Add a provider test proving `loadMonth` requests and publishes the selected month rather than the current month.
- [ ] Run it and confirm the method/behavior is absent.
- [ ] Implement `loadMonth` and call it from the calendar page-change callback.
- [ ] Remove the two unnecessary interpolation braces and the unnecessary database import.
- [ ] Run focused tests and `flutter analyze`.

### Task 5: Final verification and delivery

**Files:**
- Review all changed files and tests.

- [ ] Review the complete diff against this plan for missing requirements and unrelated changes.
- [ ] Run `git diff --check` and verify the patch contains no unrelated formatting churn.
- [ ] Run `flutter test` once as the final full-suite test.
- [ ] Run `flutter analyze` and `flutter build web --release`.
- [ ] Commit on `codex/bug-audit-fixes`, push to `origin`, and report the exact remote branch and verification evidence.
- [ ] Report deferred findings: misleading accuracy metric and Android release debug signing.

## Self-review

- Spec coverage: all three confirmed high-severity bugs, the calendar bug, and analyzer findings have explicit tasks; the two items requiring product credentials/data-model decisions are explicitly deferred.
- Placeholder scan: no TBD/TODO/implement-later placeholders remain.
- Type consistency: queue identity consistently uses annotation IDs; calendar APIs use explicit year/month integers; submission state lives in `QuizProvider`.
