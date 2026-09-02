import 'package:flutter/foundation.dart';
import '../services/quiz_service.dart';

class QuizProvider extends ChangeNotifier {
  final QuizService _quizService;
  List<Map<String, dynamic>> _queue = [];
  int _currentIndex = 0;
  int _correctCount = 0;
  bool _finished = false;
  bool _submitting = false;
  bool _answered = false;
  String? _submissionError;

  QuizProvider(this._quizService);

  List<Map<String, dynamic>> get queue => _queue;
  int get currentIndex => _currentIndex;
  int get correctCount => _correctCount;
  int get totalCount => _queue.length;
  bool get finished => _finished;
  bool get submitting => _submitting;
  bool get answered => _answered;
  String? get submissionError => _submissionError;
  Map<String, dynamic>? get currentQuestion =>
      _queue.isNotEmpty && _currentIndex < _queue.length ? _queue[_currentIndex] : null;

  Future<void> loadDailyQueue(int userId) async {
    _queue = await _quizService.buildDailyQueue(userId);
    _currentIndex = 0;
    _correctCount = 0;
    _finished = false;
    _submitting = false;
    _answered = false;
    _submissionError = null;
    notifyListeners();
  }

  Future<bool> submitAnswer(int userId, String answer, bool correct) async {
    if (_currentIndex >= _queue.length || _submitting || _answered) {
      return false;
    }
    final q = _queue[_currentIndex];
    _submitting = true;
    _submissionError = null;
    notifyListeners();
    try {
      await _quizService.submitAnswer(userId: userId, questionId: q['id'] as int, userAnswer: answer, correct: correct);
      if (correct) _correctCount++;
      _answered = true;
      return true;
    } catch (_) {
      _submissionError = '未能儲存答案，請重試。';
      return false;
    } finally {
      _submitting = false;
      notifyListeners();
    }
  }

  void nextQuestion() {
    if (!_answered || _submitting) return;
    _currentIndex++;
    _answered = false;
    _submissionError = null;
    if (_currentIndex >= _queue.length) _finished = true;
    notifyListeners();
  }

  void reset() {
    _queue = []; _currentIndex = 0; _correctCount = 0; _finished = false;
    _submitting = false; _answered = false;
    _submissionError = null;
    notifyListeners();
  }
}
