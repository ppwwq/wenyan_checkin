import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/services/database_service.dart';
import 'package:wenyan_checkin/services/seed_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('database creates all 8 tables', () async {
    final db = await DatabaseService.openInMemoryForTesting();
    addTearDown(db.close);
    final tables = await db.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    final names = tables.map((t) => t['name'] as String).toList();
    expect(
      names,
      containsAll([
        'essays',
        'annotations',
        'translations',
        'questions',
        'users',
        'study_records',
        'daily_logs',
        'mistake_log',
      ]),
    );
  });

  test('fresh seed links every word question to its annotation', () async {
    final db = await DatabaseService.openInMemoryForTesting();
    addTearDown(db.close);
    await SeedService.seedIfEmpty(db);

    final unlinked =
        (await db.rawQuery(
              "SELECT COUNT(*) FROM questions "
              "WHERE type = 'word_mc' AND annotation_id IS NULL",
            )).first.values.first
            as int;
    final mismatched =
        (await db.rawQuery(
              'SELECT COUNT(*) FROM questions q '
              'JOIN annotations a ON a.id = q.annotation_id '
              'WHERE q.essay_id != a.essay_id OR q.correct_answer != a.meaning',
            )).first.values.first
            as int;

    expect(unlinked, 0);
    expect(mismatched, 0);
  });

  test(
    'v1 to v2 migration links questions to annotations by stable order',
    () async {
      final db = await openDatabase(
        inMemoryDatabasePath,
        version: 1,
        onCreate: (db, _) async {
          await db.execute(
            'CREATE TABLE annotations ('
            'id INTEGER PRIMARY KEY, essay_id INTEGER NOT NULL, '
            'word TEXT NOT NULL, meaning TEXT NOT NULL, position INTEGER NOT NULL)',
          );
          await db.execute(
            'CREATE TABLE questions ('
            'id INTEGER PRIMARY KEY, essay_id INTEGER NOT NULL, '
            'annotation_id INTEGER, type TEXT NOT NULL)',
          );
        },
      );
      addTearDown(db.close);

      await db.insert('annotations', {
        'id': 10,
        'essay_id': 1,
        'word': '後',
        'meaning': 'later',
        'position': 1,
      });
      await db.insert('annotations', {
        'id': 20,
        'essay_id': 1,
        'word': '先',
        'meaning': 'first',
        'position': 0,
      });
      await db.insert('questions', {
        'id': 200,
        'essay_id': 1,
        'annotation_id': null,
        'type': 'word_mc',
      });
      await db.insert('questions', {
        'id': 100,
        'essay_id': 1,
        'annotation_id': null,
        'type': 'word_mc',
      });

      await DatabaseService.migrateForTesting(db, 1, 2);

      final questions = await db.query('questions', orderBy: 'id');
      expect(questions.map((q) => q['annotation_id']), [20, 10]);
    },
  );
}
