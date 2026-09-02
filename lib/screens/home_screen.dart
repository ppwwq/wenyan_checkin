import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import '../providers/streak_provider.dart';
import '../services/content_service.dart';
import '../services/ebbinghaus_service.dart';
import '../services/streak_service.dart';
import '../theme/app_theme.dart';

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
  int _dailyTarget = 5;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadReviewCounts());
  }

  Future<void> _loadReviewCounts() async {
    final ebbinghaus = context.read<EbbinghausService>();
    final streak = context.read<StreakProvider>();
    final content = context.read<ContentService>();

    final dueItems = await ebbinghaus.getDueItems(1);
    final mistakeCount = (streak.stats['pendingMistakes'] as int?) ?? 0;
    final mastered = (streak.stats['masteredEssays'] as int?) ?? 0;
    final users = await content.getUsers();
    final target = users.isNotEmpty ? (users.first['daily_target'] as int?) ?? 5 : 5;

    if (mounted) {
      setState(() {
        _dueCount = dueItems.length;
        _mistakeCount = mistakeCount;
        _masteredCount = mastered;
        _dailyTarget = target;
      });
    }
  }

  Future<void> _editDailyTarget() async {
    final controller = TextEditingController(text: '$_dailyTarget');
    final result = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('每日練習題數', style: TextStyle(fontWeight: FontWeight.w600)),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: '輸入題數',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消', style: TextStyle(color: AppTheme.secondary)),
          ),
          FilledButton(
            onPressed: () {
              final value = int.tryParse(controller.text);
              if (value != null && value > 0 && value <= 50) {
                Navigator.pop(ctx, value);
              }
            },
            style: FilledButton.styleFrom(backgroundColor: AppTheme.indigo),
            child: const Text('確定'),
          ),
        ],
      ),
    );

    if (result != null && mounted) {
      final content = context.read<ContentService>();
      await content.updateUser(1, {'daily_target': result});

      // Re-evaluate today's target and sync streak + calendar
      final streakService = await StreakService.create();
      await streakService.checkTargetMet(1);

      if (mounted) {
        setState(() => _dailyTarget = result);
        final streak = context.read<StreakProvider>();
        await streak.load(1);
      }
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

    return SafeArea(bottom: false, 
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
                  color: AppTheme.ink,
                ),
              ),
              const SizedBox(height: 4),
              InkWell(
                onTap: _editDailyTarget,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '每日 $_dailyTarget 題',
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.secondary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.edit_outlined, size: 14, color: AppTheme.secondary),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 72,
          height: 72,
          decoration: const BoxDecoration(
            color: AppTheme.indigo,
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
                  color: AppTheme.paper,
                ),
              ),
              const Text(
                '天',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.paper,
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
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
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
        onPageChanged: (focusedDay) async {
          setState(() => _focusedDay = focusedDay);
          await context.read<StreakProvider>().loadMonth(
                1,
                focusedDay.year,
                focusedDay.month,
              );
        },
        locale: 'zh_CN',
        headerStyle: HeaderStyle(
          formatButtonVisible: true,
          titleCentered: true,
          titleTextStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppTheme.ink,
          ),
          formatButtonTextStyle: const TextStyle(
            fontSize: 12,
            color: AppTheme.indigo,
          ),
          formatButtonDecoration: BoxDecoration(
            color: AppTheme.indigo.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.transparent),
          ),
          leftChevronIcon: const Icon(Icons.chevron_left, color: AppTheme.indigo, size: 20),
          rightChevronIcon: const Icon(Icons.chevron_right, color: AppTheme.indigo, size: 20),
        ),
        daysOfWeekStyle: DaysOfWeekStyle(
          weekdayStyle: const TextStyle(
            fontSize: 12,
            color: AppTheme.secondary,
          ),
          weekendStyle: TextStyle(
            fontSize: 12,
            color: AppTheme.vermillion.withValues(alpha: 0.7),
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
                      color: AppTheme.jade,
                      shape: BoxShape.circle,
                    )
                  : status == 'studied'
                      ? BoxDecoration(
                          color: AppTheme.amber.withValues(alpha: 0.3),
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
                        ? AppTheme.paper
                        : status == 'studied'
                            ? const Color(0xFF8B6914)
                            : AppTheme.ink,
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
            color: AppTheme.ink,
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
                AppTheme.amber,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildReviewCard(
                '已掌握',
                '$_masteredCount',
                '已通關篇章',
                AppTheme.jade,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildReviewCard(
                '錯題',
                '$_mistakeCount',
                '待重做',
                AppTheme.vermillion,
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
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
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
              color: AppTheme.ink,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 10,
              color: AppTheme.secondary,
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
          backgroundColor: AppTheme.indigo,
          foregroundColor: AppTheme.paper,
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
