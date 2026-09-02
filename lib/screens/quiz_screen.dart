import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/quiz_provider.dart';
import '../services/content_service.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int? _selectedIndex;
  bool? _lastCorrect;
  int? _lastAnsweredIndex;
  String _annotationWord = '';
  String _annotationMeaning = '';
  String _originalText = '';

  Future<void> _loadQuestionContext(Map<String, dynamic> question) async {
    final contentService = context.read<ContentService>();
    final essayId = question['essay_id'] as int?;
    if (essayId == null) return;

    final annotations = await contentService.getAnnotations(essayId);
    final correctAnswer = question['correct_answer'] as String? ?? '';

    Map<String, dynamic>? matched;
    // Try annotation_id first, then fall back to matching meaning
    final annotationId = question['annotation_id'];
    if (annotationId != null) {
      matched = annotations.cast<Map<String, dynamic>?>().firstWhere(
        (a) => a?['id'] == annotationId,
        orElse: () => null,
      );
    }
    matched ??= annotations.cast<Map<String, dynamic>?>().firstWhere(
      (a) => a?['meaning'] == correctAnswer,
      orElse: () => null,
    );

    if (matched != null) {
      _annotationWord = matched['word'] as String? ?? '';
      _annotationMeaning = matched['meaning'] as String? ?? '';
    } else {
      _annotationWord = '';
      _annotationMeaning = '';
    }

    // Always reload essay text (different questions may belong to different essays)
    final essay = await contentService.getEssay(essayId);
    _originalText = essay?['original_text'] as String? ?? '';
  }


  @override
  Widget build(BuildContext context) {
    final quiz = context.watch<QuizProvider>();

    return SafeArea(bottom: false, 
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
          Icon(Icons.edit_note_outlined, size: 64, color: AppTheme.secondary.withValues(alpha: 0.4)),
          const SizedBox(height: 16),
          const Text(
            '尚未載入練習',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppTheme.ink,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '點擊下方按鈕載入今日的練習題目',
            style: TextStyle(fontSize: 14, color: AppTheme.secondary),
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
                backgroundColor: AppTheme.indigo,
                foregroundColor: AppTheme.paper,
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
              color: percentage >= 80 ? AppTheme.jade.withValues(alpha: 0.12) : AppTheme.vermillion.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              percentage >= 80 ? Icons.emoji_events_outlined : Icons.refresh_outlined,
              size: 48,
              color: percentage >= 80 ? AppTheme.jade : AppTheme.vermillion,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            '練習完成',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: percentage >= 80 ? AppTheme.jade : AppTheme.ink,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '$correct / $total 正確',
            style: const TextStyle(fontSize: 18, color: AppTheme.ink),
          ),
          const SizedBox(height: 4),
          Text(
            '正確率 $percentage%',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: percentage >= 80 ? AppTheme.jade : AppTheme.vermillion,
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
                backgroundColor: AppTheme.indigo,
                foregroundColor: AppTheme.paper,
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

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
        // Progress bar
        Row(
          children: [
            Text(
              '第 ${questionIndex + 1} / ${quiz.totalCount} 題',
              style: const TextStyle(fontSize: 13, color: AppTheme.secondary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: AppTheme.border,
                  color: AppTheme.indigo,
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
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.35,
          ),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.paper,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: SingleChildScrollView(
            child: Text(
              stem,
              style: const TextStyle(
                fontSize: 18,
                color: AppTheme.ink,
                height: 1.7,
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Options
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
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
              onTap: quiz.submitting
                  ? null
                  : () => _handleAnswer(
                        quiz,
                        index,
                        options[index],
                        correctAnswer,
                      ),
            );
          },
        ),

        // Explanation & word context
        if (_lastAnsweredIndex == questionIndex && explanation.isNotEmpty) ...[
          const SizedBox(height: 12),
          // Answer feedback
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: (_lastCorrect ?? false)
                  ? AppTheme.jade.withValues(alpha: 0.08)
                  : AppTheme.vermillion.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: (_lastCorrect ?? false)
                    ? AppTheme.jade.withValues(alpha: 0.2)
                    : AppTheme.vermillion.withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (_lastCorrect ?? false) ? '✓ 正確' : '✗ 錯誤',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: (_lastCorrect ?? false) ? AppTheme.jade : AppTheme.vermillion,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '答案：$correctAnswer',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.ink),
                ),
                if (explanation.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    explanation,
                    style: TextStyle(
                      fontSize: 14,
                      color: (_lastCorrect ?? false) ? AppTheme.jade : AppTheme.vermillion,
                      height: 1.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Word meaning
          if (_annotationWord.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.indigo.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.indigo.withValues(alpha: 0.15)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('字詞釋義', style: TextStyle(fontSize: 12, color: AppTheme.secondary)),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _annotationWord,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.indigo,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(
                            _annotationMeaning,
                            style: const TextStyle(fontSize: 15, color: AppTheme.ink, height: 1.5),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
          // Original text with word highlighted
          if (_originalText.isNotEmpty && _annotationWord.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.paper,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('原文出處', style: TextStyle(fontSize: 12, color: AppTheme.secondary)),
                  const SizedBox(height: 6),
                  _buildHighlightedOriginalText(),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: () {
                setState(() {
                  _selectedIndex = null;
                  _lastCorrect = null;
                  _annotationWord = '';
                  _annotationMeaning = '';
                  _originalText = '';
                });
                quiz.nextQuestion();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.indigo,
                foregroundColor: AppTheme.paper,
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
      ),
    );
  }

  Widget _buildOptionButton({
    required int index,
    required String text,
    required bool isSelected,
    required bool isCorrect,
    required bool isAnswered,
    required bool? lastCorrect,
    required VoidCallback? onTap,
  }) {
    Color? bgColor;
    Color? borderColor;
    Color textColor = AppTheme.ink;

    if (isAnswered && isSelected) {
      if (isCorrect) {
        bgColor = AppTheme.jade.withValues(alpha: 0.1);
        borderColor = AppTheme.jade;
        textColor = AppTheme.jade;
      } else {
        bgColor = AppTheme.vermillion.withValues(alpha: 0.1);
        borderColor = AppTheme.vermillion;
        textColor = AppTheme.vermillion;
      }
    } else if (isAnswered && isCorrect) {
      bgColor = AppTheme.jade.withValues(alpha: 0.06);
      borderColor = AppTheme.jade.withValues(alpha: 0.4);
      textColor = AppTheme.jade;
    }

    return Material(
      color: bgColor ?? AppTheme.paper,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: isAnswered ? null : onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: borderColor ?? AppTheme.border,
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
                      ? (isCorrect ? AppTheme.jade : AppTheme.vermillion)
                      : isAnswered && isCorrect
                          ? AppTheme.jade.withValues(alpha: 0.2)
                          : Colors.transparent,
                  border: Border.all(
                    color: isAnswered && isSelected
                        ? (isCorrect ? AppTheme.jade : AppTheme.vermillion)
                        : isAnswered && isCorrect
                            ? AppTheme.jade
                            : AppTheme.secondary.withValues(alpha: 0.5),
                    width: 1.5,
                  ),
                ),
                child: isAnswered && (isSelected || isCorrect)
                    ? Icon(
                        isCorrect ? Icons.check : Icons.close,
                        size: 16,
                        color: isAnswered && isSelected ? AppTheme.paper : (isCorrect ? AppTheme.jade : AppTheme.vermillion),
                      )
                    : Center(
                        child: Text(
                          String.fromCharCode(65 + index), // A, B, C, D
                          style: TextStyle(fontSize: 13, color: AppTheme.secondary.withValues(alpha: 0.7)),
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

  Widget _buildHighlightedOriginalText() {
    if (_originalText.isEmpty || _annotationWord.isEmpty) {
      return const SizedBox.shrink();
    }
    final idx = _originalText.indexOf(_annotationWord);
    if (idx == -1) {
      return Text(
        _originalText,
        style: const TextStyle(fontSize: 16, color: AppTheme.ink, height: 1.8),
      );
    }
    // Extract a window of ~20 chars around the keyword
    const window = 25;
    final textLen = _originalText.length;
    final wordEnd = idx + _annotationWord.length;
    final start = (idx - window).clamp(0, textLen);
    final end = (wordEnd + window).clamp(0, textLen);
    final segment = _originalText.substring(start, end);
    final prefix = start > 0 ? '…' : '';
    final suffix = end < textLen ? '…' : '';

    final parts = segment.split(_annotationWord);
    final spans = <InlineSpan>[];
    spans.add(TextSpan(text: prefix));
    for (int i = 0; i < parts.length; i++) {
      spans.add(TextSpan(text: parts[i]));
      if (i < parts.length - 1) {
        spans.add(TextSpan(
          text: _annotationWord,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: AppTheme.vermillion,
            backgroundColor: Color(0xFFFFF3CD),
          ),
        ));
      }
    }
    spans.add(TextSpan(text: suffix));
    return RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 16, color: AppTheme.ink, height: 1.8),
        children: spans,
      ),
    );
  }

  Future<void> _handleAnswer(
    QuizProvider quiz,
    int index,
    String answer,
    String correctAnswer,
  ) async {
    final isCorrect = answer == correctAnswer;
    final question = quiz.currentQuestion!;

    final saved = await quiz.submitAnswer(1, answer, isCorrect);
    if (!mounted) return;
    if (!saved) {
      final error = quiz.submissionError;
      if (error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error)),
        );
      }
      return;
    }

    setState(() {
      _selectedIndex = index;
      _lastCorrect = isCorrect;
      _lastAnsweredIndex = quiz.currentIndex;
    });
    await _loadQuestionContext(question);
    if (mounted) setState(() {});
  }
}
