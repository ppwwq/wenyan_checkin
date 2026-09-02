import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/services/database_service.dart';
import 'package:wenyan_checkin/services/ebbinghaus_service.dart';
import 'package:wenyan_checkin/services/quiz_service.dart';
import 'package:wenyan_checkin/services/seed_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  Future<Database> seededDatabase() async {
    final db = await DatabaseService.openInMemoryForTesting();
    await SeedService.seedIfEmpty(db);
    return db;
  }

  test('due annotation schedules its linked question', () async {
    final db = await seededDatabase();
    addTearDown(db.close);
    final question = (await db.query(
      'questions',
      orderBy: 'id',
      limit: 1,
    )).first;
    final annotationId = question['annotation_id'] as int;
    await db.insert('study_records', {
      'user_id': 1,
      'target_type': 'annotation',
      'target_id': annotationId,
      'next_review_date': '2000-01-01',
    });

    final queue = await QuizService(
      db,
      EbbinghausService(db),
    ).buildDailyQueue(1);

    expect(queue.first['id'], question['id']);
    expect(queue.first['source'], 'due_annotation');
  });

  test('studied annotation is not returned as a new question', () async {
    final db = await seededDatabase();
    addTearDown(db.close);
    final question = (await db.query(
      'questions',
      orderBy: 'id',
      limit: 1,
    )).first;
    final annotationId = question['annotation_id'] as int;
    await db.delete('questions', where: 'id != ?', whereArgs: [question['id']]);
    await db.update(
      'questions',
      {'id': 10000},
      where: 'id = ?',
      whereArgs: [question['id']],
    );
    await db.insert('study_records', {
      'user_id': 1,
      'target_type': 'annotation',
      'target_id': annotationId,
      'next_review_date': '2100-01-01',
    });

    final queue = await QuizService(
      db,
      EbbinghausService(db),
    ).buildDailyQueue(1);

    expect(queue, isEmpty);
  });

  test('answer transaction rolls back every write and retry counts once',
      () async {
    final db = await seededDatabase();
    addTearDown(db.close);
    await db.update('users', {'daily_target': 1}, where: 'id = 1');
    final question = (await db.query('questions', orderBy: 'id', limit: 1)).first;
    final service = QuizService(db, EbbinghausService(db));
    await db.execute('''
      CREATE TRIGGER fail_target_update
      BEFORE UPDATE OF target_met ON daily_logs
      BEGIN
        SELECT RAISE(ABORT, 'simulated final write failure');
      END
    ''');

    await expectLater(
      service.submitAnswer(
        userId: 1,
        questionId: question['id'] as int,
        userAnswer: '錯誤答案',
        correct: false,
      ),
      throwsA(anything),
    );

    expect(await db.query('mistake_log'), isEmpty);
    expect(await db.query('study_records'), isEmpty);
    expect(await db.query('daily_logs'), isEmpty);

    await db.execute('DROP TRIGGER fail_target_update');
    await service.submitAnswer(
      userId: 1,
      questionId: question['id'] as int,
      userAnswer: '錯誤答案',
      correct: false,
    );

    expect(await db.query('mistake_log'), hasLength(1));
    final records = await db.query('study_records');
    expect(records, hasLength(2));
    expect(records.map((record) => record['review_count']), everyElement(1));
    final logs = await db.query('daily_logs');
    expect(logs, hasLength(1));
    expect(logs.single['questions_done'], 1);
    expect(logs.single['target_met'], 1);
  });
}
