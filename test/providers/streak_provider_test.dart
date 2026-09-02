import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/providers/streak_provider.dart';
import 'package:wenyan_checkin/services/database_service.dart';
import 'package:wenyan_checkin/services/streak_service.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('loadMonth replaces calendar data for the requested month', () async {
    final db = await DatabaseService.openInMemoryForTesting();
    addTearDown(db.close);
    final service = _RecordingStreakService(db);
    final provider = StreakProvider(service);

    await provider.loadMonth(42, 2025, 8);

    expect(service.requests, [(42, 2025, 8)]);
    expect(provider.monthData, {'2025-08-03': 'done'});
  });

  test('slower earlier month request cannot overwrite the latest month',
      () async {
    final db = await DatabaseService.openInMemoryForTesting();
    addTearDown(db.close);
    final service = _DelayedStreakService(db);
    final provider = StreakProvider(service);

    final august = provider.loadMonth(42, 2025, 8);
    await provider.loadMonth(42, 2025, 9);
    service.august.complete({'2025-08-03': 'done'});
    await august;

    expect(service.requests, [(42, 2025, 8), (42, 2025, 9)]);
    expect(provider.monthData, {'2025-09-04': 'studied'});
  });

  test('slow initial load cannot overwrite a later requested month',
      () async {
    final db = await DatabaseService.openInMemoryForTesting();
    addTearDown(db.close);
    final service = _DelayedInitialLoadService(db);
    final provider = StreakProvider(service);

    final initialLoad = provider.load(1);
    await service.initialMonthRequested.future;
    await provider.loadMonth(42, 2025, 9);
    service.initialMonth.complete({'current-month': 'done'});
    await initialLoad;

    expect(provider.monthData, {'2025-09-04': 'studied'});
    expect(provider.streak, 7);
    expect(provider.stats, {'pendingMistakes': 3});
  });
}

class _RecordingStreakService extends StreakService {
  final List<(int, int, int)> requests = [];

  _RecordingStreakService(super.db);

  @override
  Future<Map<String, String>> getMonthData(
    int userId,
    int year,
    int month,
  ) async {
    requests.add((userId, year, month));
    return {'2025-08-03': 'done'};
  }
}

class _DelayedStreakService extends StreakService {
  final List<(int, int, int)> requests = [];
  final Completer<Map<String, String>> august = Completer();

  _DelayedStreakService(super.db);

  @override
  Future<Map<String, String>> getMonthData(
    int userId,
    int year,
    int month,
  ) {
    requests.add((userId, year, month));
    if (month == 8) return august.future;
    return Future.value({'2025-09-04': 'studied'});
  }
}

class _DelayedInitialLoadService extends StreakService {
  final Completer<void> initialMonthRequested = Completer();
  final Completer<Map<String, String>> initialMonth = Completer();

  _DelayedInitialLoadService(super.db);

  @override
  Future<int> getStreak(int userId) async => 7;

  @override
  Future<Map<String, dynamic>> getStats(int userId) async => {
        'pendingMistakes': 3,
      };

  @override
  Future<Map<String, String>> getMonthData(
    int userId,
    int year,
    int month,
  ) {
    if (userId == 1) {
      if (!initialMonthRequested.isCompleted) initialMonthRequested.complete();
      return initialMonth.future;
    }
    return Future.value({'2025-09-04': 'studied'});
  }
}
