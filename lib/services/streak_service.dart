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
    await _db.transaction(
      (txn) => _incrementQuestions(txn, userId, count),
    );
  }

  Future<void> _incrementQuestions(
    DatabaseExecutor executor,
    int userId,
    int count,
  ) async {
    await executor.rawInsert(
      'INSERT OR IGNORE INTO daily_logs '
      '(user_id, date, questions_done, target_met) VALUES (?, ?, 0, 0)',
      [userId, today],
    );
    await executor.rawUpdate(
      'UPDATE daily_logs SET questions_done = questions_done + ? '
      'WHERE user_id = ? AND date = ?',
      [count, userId, today],
    );
  }

  Future<void> recordAnsweredQuestionInTransaction(
    DatabaseExecutor executor,
    int userId,
  ) async {
    await _incrementQuestions(executor, userId, 1);
    await _checkTargetMet(executor, userId);
  }

  Future<bool> checkTargetMet(int userId) async {
    return _checkTargetMet(_db, userId);
  }

  Future<bool> _checkTargetMet(DatabaseExecutor executor, int userId) async {
    final user = (await executor.query('users', where: 'id = ?', whereArgs: [userId])).first;
    final target = user['daily_target'] as int;
    final log = await executor.query('daily_logs',
      where: 'user_id = ? AND date = ?', whereArgs: [userId, today]);
    if (log.isEmpty) return false;
    final done = log.first['questions_done'] as int;
    if (done >= target) {
      await executor.update('daily_logs', {'target_met': 1},
        where: 'id = ?', whereArgs: [log.first['id']]);
      return true;
    }
    return false;
  }

  Future<int> getStreak(int userId) async {
    // Single query to get all target_met dates for this user, ordered descending
    final logs = await _db.rawQuery('''
      SELECT date FROM daily_logs
      WHERE user_id = ? AND target_met = 1
      ORDER BY date DESC
    ''', [userId]);

    if (logs.isEmpty) return 0;

    int streak = 0;
    // Check if today is met; if not, streak starts from yesterday
    var expected = DateTime.now();
    final todayStr = today;
    final firstDate = logs[0]['date'] as String? ?? '';

    if (firstDate != todayStr) {
      expected = expected.subtract(const Duration(days: 1));
    }

    for (final log in logs) {
      final dateStr = log['date'] as String? ?? '';
      if (dateStr == '${expected.year}-${expected.month.toString().padLeft(2, '0')}-${expected.day.toString().padLeft(2, '0')}') {
        streak++;
        expected = expected.subtract(const Duration(days: 1));
      } else {
        break;
      }
    }
    return streak;
  }

  Future<Map<String, String>> getMonthData(int userId, int year, int month) async {
    final monthStr = month.toString().padLeft(2, '0');
    final start = '$year-$monthStr-01';
    // Compute the last day of the month correctly
    final nextMonth = month == 12 ? DateTime(year + 1, 1) : DateTime(year, month + 1);
    final lastDay = nextMonth.subtract(const Duration(days: 1));
    final end = '${lastDay.year}-${lastDay.month.toString().padLeft(2, '0')}-${lastDay.day.toString().padLeft(2, '0')}';
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

  /// Get mistake details from today
  Future<List<Map<String, dynamic>>> getTodayMistakes(int userId) async {
    return await _db.rawQuery('''
      SELECT ml.*, q.stem, q.correct_answer,
             COALESCE(a.word, '(字詞)') as word,
             COALESCE(a.meaning, '') as meaning
      FROM mistake_log ml
      JOIN questions q ON ml.question_id = q.id
      LEFT JOIN annotations a ON q.annotation_id = a.id
      WHERE ml.user_id = ? AND ml.date = ?
      ORDER BY ml.date DESC
    ''', [userId, today]);
  }

  /// Get words studied today (via study_records last_review_date)
  Future<List<Map<String, dynamic>>> getTodayStudied(int userId) async {
    return await _db.rawQuery('''
      SELECT sr.*, a.word, a.meaning,
             COALESCE(ae.original_text, e.original_text) as context_text,
             e.title as essay_title
      FROM study_records sr
      LEFT JOIN annotations a ON sr.target_type = 'annotation' AND sr.target_id = a.id
      LEFT JOIN essays ae ON a.essay_id = ae.id
      LEFT JOIN essays e ON sr.target_type = 'essay' AND sr.target_id = e.id
      WHERE sr.user_id = ?
        AND sr.last_review_date = ?
        AND sr.review_count > 0
      ORDER BY sr.last_review_date DESC, sr.review_count DESC
    ''', [userId, today]);
  }

  /// Get all studied annotations with their review status
  Future<List<Map<String, dynamic>>> getAllStudiedWords(int userId) async {
    return await _db.rawQuery('''
      SELECT a.word, a.meaning, sr.review_count, sr.status, sr.next_review_date
      FROM study_records sr
      JOIN annotations a ON sr.target_type = 'annotation' AND sr.target_id = a.id
      WHERE sr.user_id = ?
      ORDER BY sr.status, sr.review_count DESC
    ''', [userId]);
  }

  /// Get all pending mistakes
  Future<List<Map<String, dynamic>>> getAllMistakes(int userId) async {
    return await _db.rawQuery('''
      SELECT ml.*, q.stem, q.correct_answer
      FROM mistake_log ml
      JOIN questions q ON ml.question_id = q.id
      WHERE ml.user_id = ? AND ml.mastered = 0
      ORDER BY ml.date DESC
    ''', [userId]);
  }
}
