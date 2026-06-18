import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/streak_provider.dart';
import '../services/ebbinghaus_service.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  Map<int, int> _retentionData = {};

  static const Color indigo = Color(0xFF3B3F8C);
  static const Color paper = Color(0xFFFBFAF5);
  static const Color ink = Color(0xFF1C1914);
  static const Color jade = Color(0xFF3B7A5C);
  static const Color vermillion = Color(0xFFC44B3B);
  static const Color secondary = Color(0xFF6B6560);
  static const Color amber = Color(0xFFE6A817);

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadRetention());
  }

  Future<void> _loadRetention() async {
    final ebbinghaus = context.read<EbbinghausService>();
    final data = await ebbinghaus.getRetentionByReviewCount(1);
    if (mounted) {
      setState(() => _retentionData = data);
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

    return SafeArea(
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
              fontFamily: 'Noto Serif TC',
              color: indigo,
              height: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '連續打卡天數',
            style: TextStyle(
              fontSize: 16,
              color: secondary,
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
      childAspectRatio: 1.3,
      children: [
        _buildStatTile('正確率', '$accuracy%', Icons.check_circle_outline, jade),
        _buildStatTile('已通關篇章', '$masteredEssays', Icons.menu_book_outlined, indigo),
        _buildStatTile('累計詞彙', '$totalWords', Icons.auto_stories_outlined, amber),
        _buildStatTile('待消錯題', '$pendingMistakes', Icons.error_outline, vermillion),
      ],
    );
  }

  Widget _buildStatTile(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: paper,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E3DE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              fontFamily: 'Noto Serif TC',
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: secondary,
            ),
          ),
        ],
      ),
    );
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
            fontFamily: 'Noto Serif TC',
            color: ink,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          '各複習次數已掌握的項目數量',
          style: TextStyle(
            fontSize: 13,
            color: secondary,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: paper,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E3DE)),
          ),
          child: _retentionData.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      '尚無複習紀錄',
                      style: TextStyle(fontSize: 14, color: secondary),
                    ),
                  ),
                )
              : Column(
                  children: List.generate(7, (i) {
                    final reviewCount = i + 1;
                    final count = _retentionData[reviewCount] ?? 0;
                    final maxCount = _retentionData.values.fold<int>(0, (a, b) => a > b ? a : b);
                    final ratio = maxCount > 0 ? count / maxCount : 0.0;
                    return _buildRetentionBar(reviewCount, count, ratio);
                  }),
                ),
        ),
      ],
    );
  }

  Widget _buildRetentionBar(int reviewCount, int count, double ratio) {
    final label = '第$reviewCount次';
    final colors = [
      indigo,
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
                color: secondary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Stack(
              children: [
                Container(
                  height: 22,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E3DE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: ratio.clamp(0.02, 1.0),
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
                color: count > 0 ? indigo : secondary.withValues(alpha: 0.5),
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}
