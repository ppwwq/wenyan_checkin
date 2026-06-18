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

    // Priority 1: Mistakes
    final mistakes = await _db.rawQuery('''
      SELECT ml.*, q.* FROM mistake_log ml
      JOIN questions q ON ml.question_id = q.id
      WHERE ml.user_id = ? AND ml.mastered = 0
      ORDER BY ml.date DESC LIMIT 10
    ''', [userId]);
    for (final m in mistakes) {
      final qid = m['question_id'];
      if (qid != null && !seenQuestionIds.contains(qid)) {
        seenQuestionIds.add(qid as int);
        queue.add({...m, 'source': 'mistake'});
      }
    }

    // Priority 2: Due annotations
    final dueItems = await _ebbinghaus.getDueItems(userId);
    for (final item in dueItems.where((i) => i['target_type'] == 'annotation')) {
      final questions = await _db.rawQuery(
        'SELECT * FROM questions WHERE annotation_id = ? LIMIT 1',
        [item['target_id']],
      );
      for (final q in questions) {
        final qid = q['id'];
        if (qid != null && !seenQuestionIds.contains(qid)) {
          seenQuestionIds.add(qid as int);
          queue.add({...q, 'source': 'due_annotation'});
        }
      }
    }

    // Priority 3: Due essays
    for (final item in dueItems.where((i) => i['target_type'] == 'essay')) {
      final questions = await _db.query('questions',
        where: 'essay_id = ?', whereArgs: [item['target_id']], limit: 5);
      for (final q in questions) {
        final qid = q['id'];
        if (qid != null && !seenQuestionIds.contains(qid)) {
          seenQuestionIds.add(qid as int);
          queue.add({...q, 'source': 'due_essay'});
        }
      }
    }

    // Priority 4: New
    if (queue.length < 20) {
      final newQuestions = await _db.rawQuery('''
        SELECT q.* FROM questions q
        WHERE q.id NOT IN (
          SELECT DISTINCT target_id FROM study_records
          WHERE user_id = ? AND target_type = 'annotation'
        ) LIMIT 5
      ''', [userId]);
      for (final q in newQuestions) {
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

    if (question['annotation_id'] != null) {
      await _ebbinghaus.recordReview(
        userId: userId, targetType: 'annotation',
        targetId: question['annotation_id'] as int, correct: correct);
    }

    await _ebbinghaus.recordReview(
      userId: userId, targetType: 'essay',
      targetId: question['essay_id'] as int, correct: correct);

    return {'question': question, 'correct': correct};
  }
}
