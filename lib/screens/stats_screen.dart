import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/streak_provider.dart';
import '../services/ebbinghaus_service.dart';
import '../services/streak_service.dart';
import '../app_info.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  Map<int, int> _retentionData = {};
  List<Map<String, dynamic>> _todayMistakes = [];
  List<Map<String, dynamic>> _todayStudied = [];

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadRetention());
    Future.microtask(() => _loadTodayData());
  }

  Future<void> _loadRetention() async {
    try {
      final ebbinghaus = context.read<EbbinghausService>();
      final data = await ebbinghaus.getRetentionByReviewCount(1);
      if (mounted) setState(() => _retentionData = data);
    } catch (e) {
      debugPrint('Failed to load retention data: $e');
    }
  }

  Future<void> _loadTodayData() async {
    try {
      final streakService = context.read<StreakService>();
      final mistakes = await streakService.getTodayMistakes(1);
      final studied = await streakService.getTodayStudied(1);
      if (mounted) {
        setState(() {
          _todayMistakes = mistakes;
          _todayStudied = studied;
        });
      }
    } catch (e) {
      debugPrint('Failed to load today data: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final streakProvider = context.watch<StreakProvider>();
    final streak = streakProvider.streak;
    final stats = streakProvider.stats;

    final accuracy = stats['accuracy'] as int? ?? 0;
    final masteredEssays = stats['masteredEssays'] as int? ?? 0;
    final totalWords = stats['totalWords'] as int? ?? 0;
    final pendingMistakes = stats['pendingMistakes'] as int? ?? 0;

    return SafeArea(bottom: false, 
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeroStreak(streak),
            const SizedBox(height: 24),
            _buildStatGrid(accuracy, masteredEssays, totalWords, pendingMistakes),
            const SizedBox(height: 24),
            _buildRetentionCurve(),
            if (_todayMistakes.isNotEmpty) ...[
              const SizedBox(height: 24),
              _buildTodaySection(
                title: '今日錯題',
                icon: Icons.error_outline,
                color: AppTheme.vermillion,
                items: _todayMistakes,
                itemBuilder: (item) => _buildMistakeItem(item),
              ),
            ],
            if (_todayStudied.isNotEmpty) ...[
              const SizedBox(height: 24),
              _buildTodaySection(
                title: '今日學過',
                icon: Icons.check_circle_outline,
                color: AppTheme.jade,
                items: _todayStudied,
                itemBuilder: (item) => _buildStudiedItem(item),
              ),
            ],
            // Version footer
            const SizedBox(height: 32),
            Center(
              child: Text(
                appVersionLabel,
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.secondary.withValues(alpha: 0.6),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroStreak(int streak) {
    return Center(
      child: Column(
        children: [
          Text(
            '$streak',
            style: const TextStyle(
              fontSize: 72,
              fontWeight: FontWeight.bold,
              color: AppTheme.indigo,
              height: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '連續打卡天數',
            style: TextStyle(
              fontSize: 16,
              color: AppTheme.secondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatGrid(int accuracy, int masteredEssays, int totalWords, int pendingMistakes) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 0.95,
      children: [
        _buildStatTile('正確率', '$accuracy%', Icons.check_circle_outline, AppTheme.jade),
        _buildStatTile('已通關篇章', '$masteredEssays', Icons.menu_book_outlined, AppTheme.indigo),
        _buildStatTile('累計詞彙', '$totalWords', Icons.auto_stories_outlined, AppTheme.amber, onTap: _showAllWords),
        _buildStatTile('待消錯題', '$pendingMistakes', Icons.error_outline, AppTheme.vermillion, onTap: _showAllMistakes),
      ],
    );
  }

  Widget _buildStatTile(String label, String value, IconData icon, Color color, {VoidCallback? onTap}) {
    final tile = Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.secondary,
            ),
          ),
        ],
      ),
    );
    if (onTap == null) return tile;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14), child: tile);
  }

  void _showAllWords() {
    final streakService = context.read<StreakService>();
    streakService.getAllStudiedWords(1).then((words) {
      if (!mounted) return;
      showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
        builder: (ctx) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.3,
          maxChildSize: 0.9,
          expand: false,
          builder: (ctx, sc) => ListView.separated(
            controller: sc,
            padding: const EdgeInsets.all(20),
            itemCount: words.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final w = words[i];
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Container(width: 6, height: 6, decoration: BoxDecoration(
                      color: (w['status'] == 'mastered') ? AppTheme.jade : AppTheme.amber,
                      shape: BoxShape.circle,
                    )),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(w['word'] as String? ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                          Text(w['meaning'] as String? ?? '', style: const TextStyle(fontSize: 13, color: AppTheme.secondary)),
                          Text('複習${w['review_count']}次 · ${w['status'] == 'mastered' ? '已掌握' : '學習中'}', style: const TextStyle(fontSize: 12, color: AppTheme.secondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      );
    }).catchError((_) {});
  }

  void _showAllMistakes() {
    final streakService = context.read<StreakService>();
    streakService.getAllMistakes(1).then((mistakes) {
      if (!mounted) return;
      showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
        builder: (ctx) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.3,
          maxChildSize: 0.9,
          expand: false,
          builder: (ctx, sc) => mistakes.isEmpty
              ? const Center(child: Text('沒有錯題', style: TextStyle(color: AppTheme.secondary)))
              : ListView.separated(
                  controller: sc,
                  padding: const EdgeInsets.all(20),
                  itemCount: mistakes.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final m = mistakes[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(m['stem'] as String? ?? '', style: const TextStyle(fontSize: 14, color: AppTheme.ink)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text('你答：${m['wrong_answer'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppTheme.vermillion)),
                              const SizedBox(width: 12),
                              Text('正確：${m['correct_answer'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppTheme.jade)),
                              const Spacer(),
                              Text('錯${m['retry_count'] ?? 0}次', style: const TextStyle(fontSize: 11, color: AppTheme.secondary)),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      );
    }).catchError((_) {});
  }

  Widget _buildRetentionCurve() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '艾賓浩斯記憶保持',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.ink,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          '各複習次數已掌握的項目數量',
          style: TextStyle(
            fontSize: 13,
            color: AppTheme.secondary,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.paper,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: _retentionData.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      '尚無複習紀錄',
                      style: TextStyle(fontSize: 14, color: AppTheme.secondary),
                    ),
                  ),
                )
              : Column(
                  children: () {
                    final entries = _retentionData.entries.toList()
                      ..sort((a, b) => a.key.compareTo(b.key));
                    final maxCount = _retentionData.values.fold<int>(0, (a, b) => a > b ? a : b);
                    return entries.map((entry) {
                      final reviewCount = entry.key;
                      final count = entry.value;
                      final ratio = maxCount > 0 ? count / maxCount : 0.0;
                      return _buildRetentionBar(reviewCount, count, ratio);
                    }).toList();
                  }(),
                ),
        ),
      ],
    );
  }

  Widget _buildRetentionBar(int reviewCount, int count, double ratio) {
    final label = '第$reviewCount次';
    final colors = [
      AppTheme.indigo,
      const Color(0xFF5B5FAC),
      const Color(0xFF7B7FC0),
      const Color(0xFF9B9FD4),
      const Color(0xFFBBBDE4),
      const Color(0xFFCFD1EC),
      const Color(0xFFE3E4F4),
    ];
    final barColor = colors[(reviewCount - 1).clamp(0, colors.length - 1)];

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.secondary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.border,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: ratio.clamp(0.0, 1.0),
                  child: Container(
                    height: 22,
                    decoration: BoxDecoration(
                      color: barColor,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 32,
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: count > 0 ? AppTheme.indigo : AppTheme.secondary.withValues(alpha: 0.5),
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodaySection({
    required String title,
    required IconData icon,
    required Color color,
    required List<Map<String, dynamic>> items,
    required Widget Function(Map<String, dynamic>) itemBuilder,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(
              '$title (${items.length})',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppTheme.ink,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.paper,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1, color: AppTheme.border),
            itemBuilder: (_, i) => itemBuilder(items[i]),
          ),
        ),
      ],
    );
  }

  Widget _buildMistakeItem(Map<String, dynamic> item) {
    final word = item['word'] as String? ?? '';
    final meaning = item['meaning'] as String? ?? '';
    final correctAnswer = item['correct_answer'] as String? ?? '';
    final wrongAnswer = item['wrong_answer'] as String? ?? '';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 6, height: 6,
                decoration: const BoxDecoration(
                  color: AppTheme.vermillion, shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                word,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.ink),
              ),
              if (meaning.isNotEmpty) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: Text(meaning, style: const TextStyle(fontSize: 13, color: AppTheme.secondary)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text('你答：$wrongAnswer', style: const TextStyle(fontSize: 12, color: AppTheme.vermillion)),
              const SizedBox(width: 12),
              Text('正確：$correctAnswer', style: const TextStyle(fontSize: 12, color: AppTheme.jade)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStudiedItem(Map<String, dynamic> item) {
    final targetType = item['target_type'] as String? ?? '';
    final word = item['word'] as String?;
    final meaning = item['meaning'] as String?;
    final essayTitle = item['essay_title'] as String?;
    final contextText = item['context_text'] as String?;
    final reviewCount = item['review_count'] as int? ?? 0;
    final interval = item['interval_days'] as int? ?? 1;
    final lastReview = item['last_review_date'] as String? ?? '';
    final nextReview = item['next_review_date'] as String? ?? '';
    final status = item['status'] as String? ?? 'learning';

    final isAnnotation = targetType == 'annotation';
    final label = isAnnotation ? (word ?? '字詞') : (essayTitle ?? '篇章');

    return InkWell(
      onTap: () => _showReviewSheet(
        word: word ?? label,
        meaning: meaning ?? '',
        contextText: contextText,
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 8, height: 8,
              decoration: BoxDecoration(
                color: status == 'mastered' ? AppTheme.jade : AppTheme.amber,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.ink)),
                      if (isAnnotation && meaning != null) ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(meaning, style: const TextStyle(fontSize: 13, color: AppTheme.secondary), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('累計$reviewCount次 · 間隔$interval天', style: const TextStyle(fontSize: 12, color: AppTheme.secondary)),
                  Row(
                    children: [
                      if (lastReview.isNotEmpty)
                        Text('上次 $lastReview', style: TextStyle(fontSize: 11, color: AppTheme.secondary.withValues(alpha: 0.6))),
                      if (nextReview.isNotEmpty) ...[
                        const SizedBox(width: 10),
                        Text('下次 $nextReview', style: TextStyle(fontSize: 11, color: AppTheme.indigo.withValues(alpha: 0.7))),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            if (status == 'mastered')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.jade.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('已掌握', style: TextStyle(fontSize: 11, color: AppTheme.jade, fontWeight: FontWeight.w600)),
              )
            else
              const Icon(Icons.chevron_right, size: 16, color: AppTheme.secondary),
          ],
        ),
      ),
    );
  }

  void _showReviewSheet({
    required String word,
    required String meaning,
    String? contextText,
  }) {
    final originalText = contextText ?? '';
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) {
        final wordInText = word.isNotEmpty && originalText.contains(word);
        String? snippet;
        if (wordInText) {
          final idx = originalText.indexOf(word);
          final start = (idx - 20).clamp(0, originalText.length);
          final end = (idx + word.length + 20).clamp(0, originalText.length);
          snippet = (start > 0 ? '…' : '') + originalText.substring(start, end) + (end < originalText.length ? '…' : '');
        }

        return DraggableScrollableSheet(
          initialChildSize: 0.55,
          minChildSize: 0.3,
          maxChildSize: 0.85,
          expand: false,
          builder: (ctx, scrollController) => SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.secondary.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                // Word + meaning
                Text(
                  word,
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.indigo),
                ),
                if (meaning.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(meaning, style: const TextStyle(fontSize: 17, color: AppTheme.ink, height: 1.6)),
                ],
                // Original text snippet
                if (snippet != null) ...[
                  const SizedBox(height: 20),
                  const Text('原文出處', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.secondary)),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.paper,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(fontSize: 16, color: AppTheme.ink, height: 1.8),
                        children: _buildHighlightSpans(snippet, word),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  List<InlineSpan> _buildHighlightSpans(String text, String keyword) {
    final parts = text.split(keyword);
    final spans = <InlineSpan>[];
    for (int i = 0; i < parts.length; i++) {
      spans.add(TextSpan(text: parts[i]));
      if (i < parts.length - 1) {
        spans.add(TextSpan(
          text: keyword,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: AppTheme.vermillion,
            backgroundColor: Color(0xFFFFF3CD),
          ),
        ));
      }
    }
    return spans;
  }
}
