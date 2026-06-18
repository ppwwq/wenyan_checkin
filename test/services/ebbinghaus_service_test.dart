import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/services/ebbinghaus_service.dart';
import 'package:wenyan_checkin/services/database_service.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('SM-2: correct answer increases interval', () async {
    final db = await DatabaseService.database;
    final service = EbbinghausService(db);
    final newInterval = service.calculateNextInterval(1, 2.5, true);
    expect(newInterval, 3); // 1 * 2.5 = 2.5 -> round to 3 (Dart rounds half up)
    await DatabaseService.close();
  });

  test('SM-2: wrong answer halves interval', () async {
    final db = await DatabaseService.database;
    final service = EbbinghausService(db);
    final newInterval = service.calculateNextInterval(4, 2.5, false);
    expect(newInterval, 2); // 4 * 0.5 = 2
    await DatabaseService.close();
  });

  test('SM-2: ease factor adjusts correctly', () async {
    final db = await DatabaseService.database;
    final service = EbbinghausService(db);
    expect(service.calculateNewEase(2.5, true), 2.6);
    expect(service.calculateNewEase(2.5, false), 2.3);
    await DatabaseService.close();
  });
}
