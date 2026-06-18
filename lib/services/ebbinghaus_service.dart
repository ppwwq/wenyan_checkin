import 'package:sqflite/sqflite.dart';
import 'database_service.dart';

class EbbinghausService {
  final Database _db;

  EbbinghausService(this._db);

  static Future<EbbinghausService> create() async {
    return EbbinghausService(await DatabaseService.database);
  }

  int calculateNextInterval(int currentInterval, double easeFactor, bool correct) {
    if (correct) {
      final newInterval = (currentInterval * easeFactor).round();
      return newInterval < currentInterval ? currentInterval + 1 : newInterval;
    } else {
      return (currentInterval * 0.5).round().clamp(1, currentInterval);
    }
  }

  double calculateNewEase(double currentEase, bool correct) {
    if (correct) {
      return (currentEase + 0.1).clamp(1.3, 3.0);
    } else {
      return (currentEase - 0.2).clamp(1.3, 3.0);
    }
  }

  Future<void> recordReview({
    required int userId,
    required String targetType,
    required int targetId,
    required bool correct,
  }) async {
    final existing = await _db.query('study_records',
      where: 'user_id = ? AND target_type = ? AND target_id = ?',
      whereArgs: [userId, targetType, targetId],
    );

    final now = DateTime.now();
    final today = now.toIso8601String().split('T')[0];

    if (existing.isEmpty) {
      final interval = correct ? 2 : 1;
      await _db.insert('study_records', {
        'user_id': userId,
        'target_type': targetType,
        'target_id': targetId,
        'review_count': 1,
        'interval_days': interval,
        'last_review_date': today,
        'next_review_date': now.add(Duration(days: interval)).toIso8601String().split('T')[0],
        'ease_factor': correct ? 2.6 : 2.3,
        'status': 'learning',
      });
    } else {
      final record = existing.first;
      final oldInterval = record['interval_days'] as int;
      final oldEase = (record['ease_factor'] as num).toDouble();
      final reviewCount = (record['review_count'] as int) + 1;

      final newInterval = calculateNextInterval(oldInterval, oldEase, correct);
      final newEase = calculateNewEase(oldEase, correct);
      final nextDate = now.add(Duration(days: newInterval));

      String status;
      if (!correct) {
        status = 'learning';
      } else if (newInterval >= 90) {
        status = 'mastered';
      } else {
        status = 'reviewing';
      }

      await _db.update('study_records', {
        'review_count': reviewCount,
        'interval_days': newInterval,
        'last_review_date': today,
        'next_review_date': nextDate.toIso8601String().split('T')[0],
        'ease_factor': newEase,
        'status': status,
      }, where: 'id = ?', whereArgs: [record['id']]);
    }
  }

  Future<List<Map<String, dynamic>>> getDueItems(int userId) async {
    final today = DateTime.now().toIso8601String().split('T')[0];
    return await _db.rawQuery('''
      SELECT sr.*,
        CASE WHEN sr.target_type = 'essay' THEN e.title
             WHEN sr.target_type = 'annotation' THEN a.word
        END as target_name
      FROM study_records sr
      LEFT JOIN essays e ON sr.target_type = 'essay' AND sr.target_id = e.id
      LEFT JOIN annotations a ON sr.target_type = 'annotation' AND sr.target_id = a.id
      WHERE sr.user_id = ? AND sr.next_review_date <= ? AND sr.status != 'mastered'
      ORDER BY sr.review_count DESC
    ''', [userId, today]);
  }

  Future<Map<int, int>> getRetentionByReviewCount(int userId) async {
    final results = await _db.rawQuery('''
      SELECT review_count, COUNT(*) as cnt
      FROM study_records
      WHERE user_id = ? AND status = 'mastered'
      GROUP BY review_count
      ORDER BY review_count
    ''', [userId]);
    return {for (final r in results) r['review_count'] as int: r['cnt'] as int};
  }

  Future<Map<String, dynamic>> getEssayProgress(int userId, int essayId) async {
    final totalWords = Sqflite.firstIntValue(await _db.rawQuery(
      'SELECT COUNT(*) FROM annotations WHERE essay_id = ?', [essayId]
    )) ?? 0;
    final masteredWords = Sqflite.firstIntValue(await _db.rawQuery(
      '''SELECT COUNT(*) FROM study_records
         WHERE user_id = ? AND target_type = 'annotation'
         AND target_id IN (SELECT id FROM annotations WHERE essay_id = ?)
         AND status = 'mastered' ''',
      [userId, essayId]
    )) ?? 0;
    return {'total': totalWords, 'mastered': masteredWords};
  }
}
