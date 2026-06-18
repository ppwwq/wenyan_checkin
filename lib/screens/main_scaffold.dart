import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/streak_provider.dart';
import 'home_screen.dart';
import 'essay_list_screen.dart';
import 'quiz_screen.dart';
import 'stats_screen.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});
  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentTab = 0;

  @override
  void initState() {
    super.initState();
    final provider = context.read<StreakProvider>();
    Future.microtask(() => provider.load(1));
  }

  void _switchToTab(int index) {
    setState(() => _currentTab = index);
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(onStartReview: () => _switchToTab(2)),
      const EssayListScreen(),
      const QuizScreen(),
      const StatsScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentTab, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentTab,
        onDestinationSelected: (i) => setState(() => _currentTab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view, color: Color(0xFF3B3F8C)), label: '首頁'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book, color: Color(0xFF3B3F8C)), label: '篇章'),
          NavigationDestination(icon: Icon(Icons.edit_note_outlined), selectedIcon: Icon(Icons.edit_note, color: Color(0xFF3B3F8C)), label: '練習'),
          NavigationDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart, color: Color(0xFF3B3F8C)), label: '統計'),
        ],
      ),
    );
  }
}
