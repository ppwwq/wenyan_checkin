import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/quiz_provider.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int? _selectedIndex;
  bool? _lastCorrect;
  int? _lastAnsweredIndex;

  static const Color indigo = Color(0xFF3B3F8C);
  static const Color paper = Color(0xFFFBFAF5);
  static const Color ink = Color(0xFF1C1914);
  static const Color jade = Color(0xFF3B7A5C);
  static const Color vermillion = Color(0xFFC44B3B);
  static const Color secondary = Color(0xFF6B6560);

  @override
  Widget build(BuildContext context) {
    final quiz = context.watch<QuizProvider>();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: quiz.queue.isEmpty && !quiz.finished
            ? _buildEmptyState(quiz)
            : quiz.finished
                ? _buildFinishedState(quiz)
                : _buildQuizState(quiz),
      ),
    );
  }

  Widget _buildEmptyState(QuizProvider quiz) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.edit_note_outlined, size: 64, color: secondary.withValues(alpha: 0.4)),
          const SizedBox(height: 16),
          const Text(
            '尚未載入練習',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              fontFamily: 'Noto Serif TC',
              color: ink,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '點擊下方按鈕載入今日的練習題目',
            style: TextStyle(fontSize: 14, color: secondary),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: 200,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () => quiz.loadDailyQueue(1),
              icon: const Icon(Icons.download_outlined, size: 18),
              label: const Text('載入今日練習', style: TextStyle(fontSize: 15)),
              style: ElevatedButton.styleFrom(
                backgroundColor: indigo,
                foregroundColor: paper,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinishedState(QuizProvider quiz) {
    final total = quiz.totalCount;
    final correct = quiz.correctCount;
    final percentage = total > 0 ? (correct / total * 100).round() : 0;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: percentage >= 80 ? jade.withValues(alpha: 0.12) : vermillion.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              percentage >= 80 ? Icons.emoji_events_outlined : Icons.refresh_outlined,
              size: 48,
              color: percentage >= 80 ? jade : vermillion,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            '練習完成',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              fontFamily: 'Noto Serif TC',
              color: percentage >= 80 ? jade : ink,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '$correct / $total 正確',
            style: const TextStyle(fontSize: 18, color: ink),
          ),
          const SizedBox(height: 4),
          Text(
            '正確率 $percentage%',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: percentage >= 80 ? jade : vermillion,
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: 200,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () => quiz.loadDailyQueue(1),
              icon: const Icon(Icons.replay_outlined, size: 18),
              label: const Text('再來一輪', style: TextStyle(fontSize: 15)),
              style: ElevatedButton.styleFrom(
                backgroundColor: indigo,
                foregroundColor: paper,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuizState(QuizProvider quiz) {
    final question = quiz.currentQuestion;
    if (question == null) return const SizedBox.shrink();

    final stem = question['stem'] as String? ?? '';
    final optionsJson = question['options'] as String? ?? '[]';
    List<dynamic> optionsRaw;
    try {
      optionsRaw = json.decode(optionsJson) as List<dynamic>;
    } catch (_) {
      optionsRaw = [];
    }
    final options = optionsRaw.map((o) => o.toString()).toList();
    final correctAnswer = question['correct_answer'] as String? ?? '';
    final explanation = question['explanation'] as String? ?? '';

    final progress = (quiz.currentIndex + 1) / quiz.totalCount;
    final questionIndex = quiz.currentIndex;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Progress bar
        Row(
          children: [
            Text(
              '第 ${questionIndex + 1} / ${quiz.totalCount} 題',
              style: const TextStyle(fontSize: 13, color: secondary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: const Color(0xFFE5E3DE),
                  color: indigo,
                  minHeight: 6,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Question stem
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: paper,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E3DE)),
          ),
          child: Text(
            stem,
            style: const TextStyle(
              fontSize: 18,
              fontFamily: 'Noto Serif TC',
              color: ink,
              height: 1.7,
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Options
        Expanded(
          child: ListView.separated(
            itemCount: options.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              return _buildOptionButton(
                index: index,
                text: options[index],
                isSelected: _selectedIndex == index,
                isCorrect: options[index] == correctAnswer,
                isAnswered: _lastAnsweredIndex == questionIndex,
                lastCorrect: _lastCorrect,
                onTap: () => _handleAnswer(quiz, index, options[index], correctAnswer),
              );
            },
          ),
        ),

        // Explanation
        if (_lastAnsweredIndex == questionIndex && explanation.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: (_lastCorrect ?? false)
                  ? jade.withValues(alpha: 0.08)
                  : vermillion.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: (_lastCorrect ?? false)
                    ? jade.withValues(alpha: 0.2)
                    : vermillion.withValues(alpha: 0.2),
              ),
            ),
            child: Text(
              explanation,
              style: TextStyle(
                fontSize: 14,
                color: (_lastCorrect ?? false) ? jade : vermillion,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: () {
                setState(() {
                  _selectedIndex = null;
                  _lastCorrect = null;
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: indigo,
                foregroundColor: paper,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 0,
              ),
              child: const Text('下一題', style: TextStyle(fontSize: 15)),
            ),
          ),
        ],
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildOptionButton({
    required int index,
    required String text,
    required bool isSelected,
    required bool isCorrect,
    required bool isAnswered,
    required bool? lastCorrect,
    required VoidCallback onTap,
  }) {
    Color? bgColor;
    Color? borderColor;
    Color textColor = ink;

    if (isAnswered && isSelected) {
      if (isCorrect) {
        bgColor = jade.withValues(alpha: 0.1);
        borderColor = jade;
        textColor = jade;
      } else {
        bgColor = vermillion.withValues(alpha: 0.1);
        borderColor = vermillion;
        textColor = vermillion;
      }
    } else if (isAnswered && isCorrect) {
      bgColor = jade.withValues(alpha: 0.06);
      borderColor = jade.withValues(alpha: 0.4);
      textColor = jade;
    }

    return Material(
      color: bgColor ?? paper,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: isAnswered ? null : onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: borderColor ?? const Color(0xFFE5E3DE),
              width: isAnswered && isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isAnswered && isSelected
                      ? (isCorrect ? jade : vermillion)
                      : isAnswered && isCorrect
                          ? jade.withValues(alpha: 0.2)
                          : Colors.transparent,
                  border: Border.all(
                    color: isAnswered && isSelected
                        ? (isCorrect ? jade : vermillion)
                        : isAnswered && isCorrect
                            ? jade
                            : secondary.withValues(alpha: 0.5),
                    width: 1.5,
                  ),
                ),
                child: isAnswered && (isSelected || isCorrect)
                    ? Icon(
                        isCorrect ? Icons.check : Icons.close,
                        size: 16,
                        color: isAnswered && isSelected ? paper : (isCorrect ? jade : vermillion),
                      )
                    : Center(
                        child: Text(
                          String.fromCharCode(65 + index), // A, B, C, D
                          style: TextStyle(fontSize: 13, color: secondary.withValues(alpha: 0.7)),
                        ),
                      ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  text,
                  style: TextStyle(
                    fontSize: 15,
                    color: textColor,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleAnswer(QuizProvider quiz, int index, String answer, String correctAnswer) {
    final isCorrect = answer == correctAnswer;

    setState(() {
      _selectedIndex = index;
      _lastCorrect = isCorrect;
      _lastAnsweredIndex = quiz.currentIndex;
    });

    final message = isCorrect ? '正確！' : '答錯了';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: TextStyle(
            color: isCorrect ? jade : vermillion,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: (isCorrect ? jade : vermillion).withValues(alpha: 0.1),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(milliseconds: 800),
      ),
    );

    quiz.submitAnswer(1, answer, isCorrect);
  }
}
