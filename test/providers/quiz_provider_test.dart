import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:wenyan_checkin/providers/quiz_provider.dart';
import 'package:wenyan_checkin/services/database_service.dart';
import 'package:wenyan_checkin/services/ebbinghaus_service.dart';
import 'package:wenyan_checkin/services/quiz_service.dart';
import 'package:wenyan_checkin/services/seed_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('submitAnswer blocks duplicates until nextQuestion', () async {
    final db = await DatabaseService.openInMemoryForTesting();
    addTearDown(db.close);
    await SeedService.seedIfEmpty(db);
    final provider = QuizProvider(QuizService(db, EbbinghausService(db)));
    await provider.loadDailyQueue(1);
    final correctAnswer = provider.currentQuestion!['correct_answer'] as String;

    final first = provider.submitAnswer(1, correctAnswer, true);
    expect(provider.submitting, isTrue);
    final duplicate = provider.submitAnswer(1, correctAnswer, true);

    expect(await duplicate, isFalse);
    expect(await first, isTrue);
    expect(provider.submitting, isFalse);
    expect(provider.answered, isTrue);
    final logs = await db.query('daily_logs');
    expect(logs.single['questions_done'], 1);

    provider.nextQuestion();
    expect(provider.answered, isFalse);
  });

  test(
    'failed submission can be retried and exposes a user-facing error',
    () async {
      final db = await DatabaseService.openInMemoryForTesting();
      addTearDown(db.close);
      await SeedService.seedIfEmpty(db);
      final quizService = _FailOnceQuizService(db);
    final provider = QuizProvider(quizService);
      await provider.loadDailyQueue(1);
      final answer = provider.currentQuestion!['correct_answer'] as String;

      expect(await provider.submitAnswer(1, answer, true), isFalse);
      expect(provider.submitting, isFalse);
      expect(provider.answered, isFalse);
      expect(provider.submissionError, isNotEmpty);

      expect(await provider.submitAnswer(1, answer, true), isTrue);
      expect(provider.answered, isTrue);
      expect(provider.submissionError, isNull);
    },
  );
}

class _FailOnceQuizService extends QuizService {
  bool _fail = true;

  _FailOnceQuizService(Database db) : super(db, EbbinghausService(db));

  @override
  Future<Map<String, dynamic>> submitAnswer({
    required int userId,
    required int questionId,
    required String userAnswer,
    required bool correct,
  }) async {
    if (_fail) {
      _fail = false;
      throw StateError('simulated write failure');
    }
    return {'correct': correct};
  }
}
