import 'package:sqflite/sqflite.dart';
import 'database_service.dart';

class StreakService {
  final Database _db;

  StreakService(this._db);

  static Future<StreakService> create() async {
    return StreakService(await DatabaseService.database);
  }

  String get today => DateTime.now().toIso8601String().split('T')[0];

  Future<void> logQuestions(int userId, int count) async {
    final existing = await _db.query('daily_logs',
      where: 'user_id = ? AND date = ?', whereArgs: [userId, today]);
    if (existing.isEmpty) {
      await _db.insert('daily_logs', {
        'user_id': userId, 'date': today,
        'questions_done': count, 'target_met': 0,
      });
    } else {
      await _db.update('daily_logs',
        {'questions_done': (existing.first['questions_done'] as int) + count},
        where: 'id = ?', whereArgs: [existing.first['id']]);
    }
  }

  Future<bool> checkTargetMet(int userId) async {
    final user = (await _db.query('users', where: 'id = ?', whereArgs: [userId])).first;
    final target = user['daily_target'] as int;
    final log = await _db.query('daily_logs',
      where: 'user_id = ? AND date = ?', whereArgs: [userId, today]);
    if (log.isEmpty) return false;
    final done = log.first['questions_done'] as int;
    if (done >= target) {
      await _db.update('daily_logs', {'target_met': 1},
        where: 'id = ?', whereArgs: [log.first['id']]);
      return true;
    }
    return false;
  }

  Future<int> getStreak(int userId) async {
    int streak = 0;
    var checkDate = DateTime.now();
    // Check today first, if not met, start counting from yesterday
    final todayLog = await _db.query('daily_logs',
      where: 'user_id = ? AND date = ? AND target_met = 1',
      whereArgs: [userId, today]);
    if (todayLog.isEmpty) {
      checkDate = checkDate.subtract(const Duration(days: 1));
    }
    while (true) {
      final dateStr = checkDate.toIso8601String().split('T')[0];
      final log = await _db.query('daily_logs',
        where: 'user_id = ? AND date = ? AND target_met = 1',
        whereArgs: [userId, dateStr]);
      if (log.isNotEmpty) {
        streak++;
        checkDate = checkDate.subtract(const Duration(days: 1));
      } else {
        break;
      }
    }
    return streak;
  }

  Future<Map<String, String>> getMonthData(int userId, int year, int month) async {
    final monthStr = month.toString().padLeft(2, '0');
    final start = '$year-$monthStr-01';
    final end = '$year-$monthStr-31';
    final logs = await _db.query('daily_logs',
      where: 'user_id = ? AND date >= ? AND date <= ?',
      whereArgs: [userId, start, end]);
    final result = <String, String>{};
    for (final log in logs) {
      result[log['date'] as String] = log['target_met'] == 1 ? 'done' : 'studied';
    }
    return result;
  }

  Future<Map<String, dynamic>> getStats(int userId) async {
    final totalStudyRecords = Sqflite.firstIntValue(await _db.rawQuery(
      'SELECT COUNT(*) FROM study_records WHERE user_id = ?', [userId])) ?? 0;
    final masteredStudyRecords = Sqflite.firstIntValue(await _db.rawQuery(
      "SELECT COUNT(*) FROM study_records WHERE user_id = ? AND status = 'mastered'", [userId])) ?? 0;
    final masteredEssays = Sqflite.firstIntValue(await _db.rawQuery(
      "SELECT COUNT(*) FROM study_records WHERE user_id = ? AND target_type = 'essay' AND status = 'mastered'", [userId])) ?? 0;
    final pendingMistakes = Sqflite.firstIntValue(await _db.rawQuery(
      'SELECT COUNT(*) FROM mistake_log WHERE user_id = ? AND mastered = 0', [userId])) ?? 0;
    return {
      'accuracy': totalStudyRecords > 0 ? (masteredStudyRecords / totalStudyRecords * 100).round() : 0,
      'masteredEssays': masteredEssays,
      'totalWords': totalStudyRecords,
      'pendingMistakes': pendingMistakes,
    };
  }
}
