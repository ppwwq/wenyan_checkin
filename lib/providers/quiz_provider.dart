import 'package:flutter/foundation.dart';
import '../services/quiz_service.dart';
import '../services/streak_service.dart';

class QuizProvider extends ChangeNotifier {
  final QuizService _quizService;
  final StreakService _streakService;
  List<Map<String, dynamic>> _queue = [];
  int _currentIndex = 0;
  int _correctCount = 0;
  bool _finished = false;

  QuizProvider(this._quizService, this._streakService);

  List<Map<String, dynamic>> get queue => _queue;
  int get currentIndex => _currentIndex;
  int get correctCount => _correctCount;
  int get totalCount => _queue.length;
  bool get finished => _finished;
  Map<String, dynamic>? get currentQuestion =>
      _queue.isNotEmpty && _currentIndex < _queue.length ? _queue[_currentIndex] : null;

  Future<void> loadDailyQueue(int userId) async {
    _queue = await _quizService.buildDailyQueue(userId);
    _currentIndex = 0;
    _correctCount = 0;
    _finished = false;
    notifyListeners();
  }

  Future<void> submitAnswer(int userId, String answer, bool correct) async {
    if (_currentIndex >= _queue.length) return;
    final q = _queue[_currentIndex];
    await _quizService.submitAnswer(userId: userId, questionId: q['id'] as int, userAnswer: answer, correct: correct);
    if (correct) _correctCount++;
    await _streakService.logQuestions(userId, 1);
    await _streakService.checkTargetMet(userId);
    // Don't advance index — wait for nextQuestion() to be called
    notifyListeners();
  }

  void nextQuestion() {
    _currentIndex++;
    if (_currentIndex >= _queue.length) _finished = true;
    notifyListeners();
  }

  void reset() {
    _queue = []; _currentIndex = 0; _correctCount = 0; _finished = false;
    notifyListeners();
  }
}
