import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/services/database_service.dart';
import 'package:wenyan_checkin/services/seed_service.dart';
import 'package:wenyan_checkin/services/streak_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('concurrent question logs are atomically accumulated', () async {
    final db = await DatabaseService.openInMemoryForTesting();
    addTearDown(db.close);
    await SeedService.seedIfEmpty(db);
    final service = StreakService(db);

    await Future.wait([service.logQuestions(1, 1), service.logQuestions(1, 1)]);

    final logs = await db.query(
      'daily_logs',
      where: 'user_id = ?',
      whereArgs: [1],
    );
    expect(logs, hasLength(1));
    expect(logs.single['questions_done'], 2);
  });
}
