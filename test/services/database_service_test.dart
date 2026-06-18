import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/services/database_service.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('database creates all 8 tables', () async {
    final db = await DatabaseService.database;
    final tables = await db.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    final names = tables.map((t) => t['name'] as String).toList();
    expect(names, containsAll([
      'essays', 'annotations', 'translations', 'questions',
      'users', 'study_records', 'daily_logs', 'mistake_log',
    ]));
    await DatabaseService.close();
  });
}
