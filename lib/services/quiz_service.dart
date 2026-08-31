import 'package:sqflite/sqflite.dart';
import 'database_service.dart';
import 'ebbinghaus_service.dart';

class QuizService {
  final Database _db;
  final EbbinghausService _ebbinghaus;

  QuizService(this._db, this._ebbinghaus);

  static Future<QuizService> create() async {
    final db = await DatabaseService.database;
    return QuizService(db, EbbinghausService(db));
  }

  Future<List<Map<String, dynamic>>> buildDailyQueue(int userId) async {
    final queue = <Map<String, dynamic>>[];
    final seenQuestionIds = <int>{};

    // Get daily target and today's already-done count
    final users = await _db.query('users', where: 'id = ?', whereArgs: [userId]);
    final target = users.isNotEmpty ? (users.first['daily_target'] as int?) ?? 5 : 5;
    final today = DateTime.now().toIso8601String().split('T')[0];
    final todayDone = Sqflite.firstIntValue(await _db.rawQuery(
      'SELECT COALESCE(SUM(questions_done), 0) FROM daily_logs WHERE user_id = ? AND date = ?',
      [userId, today],
    )) ?? 0;
    final remaining = (target - todayDone).clamp(0, target).toInt();
    if (remaining == 0) return queue;

    int added() => queue.length;

    // Priority 1: Mistakes (max up to remaining)
    final mistakes = await _db.rawQuery('''
      SELECT q.*, ml.question_id, ml.wrong_answer, ml.date,
             ml.retry_count, ml.mastered
      FROM mistake_log ml
      JOIN questions q ON ml.question_id = q.id
      WHERE ml.user_id = ? AND ml.mastered = 0
      ORDER BY ml.date DESC LIMIT ?
    ''', [userId, remaining]);
    for (final m in mistakes) {
      if (added() >= remaining) break;
      final qid = m['question_id'];
      if (qid != null && !seenQuestionIds.contains(qid)) {
        seenQuestionIds.add(qid as int);
        queue.add({...m, 'source': 'mistake'});
      }
    }

    // Priority 2: Due annotations
    if (added() < remaining) {
      final dueItems = await _ebbinghaus.getDueItems(userId);
      for (final item in dueItems.where((i) => i['target_type'] == 'annotation')) {
        if (added() >= remaining) break;
        final questions = await _db.rawQuery(
          'SELECT * FROM questions WHERE annotation_id = ? LIMIT 1',
          [item['target_id']],
        );
        for (final q in questions) {
          if (added() >= remaining) break;
          final qid = q['id'];
          if (qid != null && !seenQuestionIds.contains(qid)) {
            seenQuestionIds.add(qid as int);
            queue.add({...q, 'source': 'due_annotation'});
          }
        }
      }

      // Priority 3: Due essays
      for (final item in dueItems.where((i) => i['target_type'] == 'essay')) {
        if (added() >= remaining) break;
        final questions = await _db.query('questions',
          where: 'essay_id = ?', whereArgs: [item['target_id']], limit: remaining - added());
        for (final q in questions) {
          if (added() >= remaining) break;
          final qid = q['id'];
          if (qid != null && !seenQuestionIds.contains(qid)) {
            seenQuestionIds.add(qid as int);
            queue.add({...q, 'source': 'due_essay'});
          }
        }
      }
    }

    // Priority 4: New
    if (added() < remaining) {
      // "New" = a question whose source annotation has never been reviewed.
      // Link through annotation_id (NOT q.id) — q.id and annotations.id are
      // independent auto-increment sequences and would never match.
      final newQuestions = await _db.rawQuery('''
        SELECT q.* FROM questions q
        WHERE q.annotation_id IS NOT NULL
          AND q.annotation_id NOT IN (
            SELECT DISTINCT target_id FROM study_records
            WHERE user_id = ? AND target_type = 'annotation'
          ) LIMIT ?
      ''', [userId, remaining - added()]);
      for (final q in newQuestions) {
        if (added() >= remaining) break;
        final qid = q['id'];
        if (qid != null && !seenQuestionIds.contains(qid)) {
          seenQuestionIds.add(qid as int);
          queue.add({...q, 'source': 'new'});
        }
      }
    }

    return queue;
  }

  Future<Map<String, dynamic>> submitAnswer({
    required int userId,
    required int questionId,
    required String userAnswer,
    required bool correct,
  }) async {
    final question = (await _db.query('questions', where: 'id = ?', whereArgs: [questionId])).first;

    if (!correct) {
      final existing = await _db.query('mistake_log',
        where: 'user_id = ? AND question_id = ? AND mastered = 0',
        whereArgs: [userId, questionId]);
      if (existing.isEmpty) {
        await _db.insert('mistake_log', {
          'user_id': userId, 'question_id': questionId,
          'wrong_answer': userAnswer, 'retry_count': 1,
        });
      } else {
        await _db.update('mistake_log',
          {'retry_count': (existing.first['retry_count'] as int) + 1, 'wrong_answer': userAnswer},
          where: 'id = ?', whereArgs: [existing.first['id']]);
      }
    } else {
      final existing = await _db.query('mistake_log',
        where: 'user_id = ? AND question_id = ? AND mastered = 0',
        whereArgs: [userId, questionId]);
      if (existing.isNotEmpty) {
        final retryCount = (existing.first['retry_count'] as int) + 1;
        if (retryCount >= 3) {
          await _db.update('mistake_log', {'mastered': 1},
            where: 'id = ?', whereArgs: [existing.first['id']]);
        } else {
          await _db.update('mistake_log', {'retry_count': retryCount},
            where: 'id = ?', whereArgs: [existing.first['id']]);
        }
      }
    }

    // Find annotation id — if not set, match by correct_answer == meaning
    var annotationId = question['annotation_id'] as int?;
    if (annotationId == null) {
      final annotations = await _db.query('annotations',
        where: 'essay_id = ? AND meaning = ?',
        whereArgs: [question['essay_id'], question['correct_answer']],
      );
      if (annotations.isNotEmpty) {
        annotationId = annotations.first['id'] as int?;
      }
    }
    if (annotationId != null) {
      await _ebbinghaus.recordReview(
        userId: userId, targetType: 'annotation',
        targetId: annotationId, correct: correct);
    }

    await _ebbinghaus.recordReview(
      userId: userId, targetType: 'essay',
      targetId: question['essay_id'] as int, correct: correct);

    return {'question': question, 'correct': correct};
  }
}
