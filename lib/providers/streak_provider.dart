import 'package:flutter/foundation.dart';
import '../services/streak_service.dart';

class StreakProvider extends ChangeNotifier {
  final StreakService _streakService;
  int _streak = 0;
  Map<String, String> _monthData = {};
  Map<String, dynamic> _stats = {};

  StreakProvider(this._streakService);

  int get streak => _streak;
  Map<String, String> get monthData => _monthData;
  Map<String, dynamic> get stats => _stats;

  Future<void> load(int userId) async {
    _streak = await _streakService.getStreak(userId);
    final now = DateTime.now();
    _monthData = await _streakService.getMonthData(userId, now.year, now.month);
    _stats = await _streakService.getStats(userId);
    notifyListeners();
  }

  Future<void> refreshStats(int userId) async {
    _stats = await _streakService.getStats(userId);
    notifyListeners();
  }
}
