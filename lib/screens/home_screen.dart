import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import '../providers/streak_provider.dart';
import '../services/ebbinghaus_service.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback? onStartReview;

  const HomeScreen({super.key, this.onStartReview});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime _focusedDay = DateTime.now();
  CalendarFormat _calendarFormat = CalendarFormat.month;
  int _dueCount = 0;
  int _mistakeCount = 0;
  int _masteredCount = 0;

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
    Future.microtask(() => _loadReviewCounts());
  }

  Future<void> _loadReviewCounts() async {
    final ebbinghaus = context.read<EbbinghausService>();
    final streak = context.read<StreakProvider>();

    final dueItems = await ebbinghaus.getDueItems(1);
    final mistakeCount = (streak.stats['pendingMistakes'] as int?) ?? 0;
    final mastered = (streak.stats['masteredEssays'] as int?) ?? 0;

    if (mounted) {
      setState(() {
        _dueCount = dueItems.length;
        _mistakeCount = mistakeCount;
        _masteredCount = mastered;
      });
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  }

  @override
  Widget build(BuildContext context) {
    final streakProvider = context.watch<StreakProvider>();
    final streak = streakProvider.streak;
    final monthData = streakProvider.monthData;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGreetingHeader(streak),
            const SizedBox(height: 20),
            _buildCalendar(monthData),
            const SizedBox(height: 20),
            _buildReviewCards(),
            const SizedBox(height: 24),
            _buildStartButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildGreetingHeader(int streak) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_greeting()}，我',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Noto Serif TC',
                  color: ink,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                '持續學習，積沙成塔',
                style: TextStyle(
                  fontSize: 14,
                  color: secondary,
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 72,
          height: 72,
          decoration: const BoxDecoration(
            color: indigo,
            shape: BoxShape.circle,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$streak',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: paper,
                ),
              ),
              const Text(
                '天',
                style: TextStyle(
                  fontSize: 12,
                  color: paper,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCalendar(Map<String, String> monthData) {
    return Container(
      decoration: BoxDecoration(
        color: paper,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E3DE)),
      ),
      child: TableCalendar(
        firstDay: DateTime.utc(2020, 1, 1),
        lastDay: DateTime.utc(2030, 12, 31),
        focusedDay: _focusedDay,
        calendarFormat: _calendarFormat,
        availableCalendarFormats: const {
          CalendarFormat.month: '月',
          CalendarFormat.twoWeeks: '兩週',
          CalendarFormat.week: '週',
        },
        onFormatChanged: (format) {
          setState(() => _calendarFormat = format);
        },
        onPageChanged: (focusedDay) {
          setState(() => _focusedDay = focusedDay);
        },
        locale: 'zh_CN',
        headerStyle: HeaderStyle(
          formatButtonVisible: true,
          titleCentered: true,
          titleTextStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            fontFamily: 'Noto Serif TC',
            color: ink,
          ),
          formatButtonTextStyle: const TextStyle(
            fontSize: 12,
            color: indigo,
          ),
          formatButtonDecoration: BoxDecoration(
            color: indigo.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.transparent),
          ),
          leftChevronIcon: const Icon(Icons.chevron_left, color: indigo, size: 20),
          rightChevronIcon: const Icon(Icons.chevron_right, color: indigo, size: 20),
        ),
        daysOfWeekStyle: DaysOfWeekStyle(
          weekdayStyle: const TextStyle(
            fontSize: 12,
            color: secondary,
          ),
          weekendStyle: TextStyle(
            fontSize: 12,
            color: vermillion.withValues(alpha: 0.7),
          ),
        ),
        calendarBuilders: CalendarBuilders(
          defaultBuilder: (context, date, focusedDay) {
            final key = DateFormat('yyyy-MM-dd').format(date);
            final status = monthData[key];
            return Container(
              margin: const EdgeInsets.all(4),
              decoration: status == 'done'
                  ? const BoxDecoration(
                      color: jade,
                      shape: BoxShape.circle,
                    )
                  : status == 'studied'
                      ? BoxDecoration(
                          color: amber.withValues(alpha: 0.3),
                          shape: BoxShape.circle,
                        )
                      : null,
              child: Center(
                child: Text(
                  '${date.day}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: status != null ? FontWeight.bold : FontWeight.normal,
                    color: status == 'done'
                        ? paper
                        : status == 'studied'
                            ? const Color(0xFF8B6914)
                            : ink,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildReviewCards() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '今日複習',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            fontFamily: 'Noto Serif TC',
            color: ink,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildReviewCard(
                '待複習',
                '$_dueCount',
                '需今天完成',
                amber,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildReviewCard(
                '已掌握',
                '$_masteredCount',
                '已通關篇章',
                jade,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildReviewCard(
                '錯題',
                '$_mistakeCount',
                '待重做',
                vermillion,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildReviewCard(String label, String count, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: paper,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E3DE)),
      ),
      child: Column(
        children: [
          Text(
            count,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: ink,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 10,
              color: secondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStartButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: widget.onStartReview,
        style: ElevatedButton.styleFrom(
          backgroundColor: indigo,
          foregroundColor: paper,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: const Text(
          '開始複習',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
