import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/services/ebbinghaus_service.dart';
import 'package:wenyan_checkin/services/database_service.dart';
import 'package:wenyan_checkin/services/seed_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Database db;
  late EbbinghausService service;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() async {
    db = await DatabaseService.openInMemoryForTesting();
    service = EbbinghausService(db);
  });

  tearDown(() => db.close());

  test('SM-2: correct answer increases interval', () async {
    final newInterval = service.calculateNextInterval(1, 2.5, true);
    expect(newInterval, 3); // 1 * 2.5 = 2.5 -> round to 3 (Dart rounds half up)
  });

  test('SM-2: wrong answer halves interval', () async {
    final newInterval = service.calculateNextInterval(4, 2.5, false);
    expect(newInterval, 2); // 4 * 0.5 = 2
  });

  test('SM-2: ease factor adjusts correctly', () async {
    expect(service.calculateNewEase(2.5, true), 2.6);
    expect(service.calculateNewEase(2.5, false), 2.3);
  });

  test('concurrent reviews atomically increment one study record', () async {
    await SeedService.seedIfEmpty(db);
    final annotation = (await db.query('annotations', limit: 1)).first;

    await Future.wait([
      service.recordReview(
        userId: 1,
        targetType: 'annotation',
        targetId: annotation['id'] as int,
        correct: true,
      ),
      service.recordReview(
        userId: 1,
        targetType: 'annotation',
        targetId: annotation['id'] as int,
        correct: true,
      ),
    ]);

    final records = await db.query('study_records');
    expect(records, hasLength(1));
    expect(records.single['review_count'], 2);
  });
}
