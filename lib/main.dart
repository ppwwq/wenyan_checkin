import 'package:flutter/material.dart';
import 'package:sqflite/sqflite.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'services/database_service.dart';
import 'services/seed_service.dart';
import 'services/content_service.dart';
import 'services/ebbinghaus_service.dart';
import 'services/quiz_service.dart';
import 'services/streak_service.dart';
import 'providers/quiz_provider.dart';
import 'providers/streak_provider.dart';
import 'screens/main_scaffold.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('zh_HK');

  // Initialize services individually — each one may fail gracefully
  Database? db;
  ContentService? contentService;
  EbbinghausService? ebbinghausService;
  StreakService? streakService;
  QuizService? quizService;

  bool shellMode = false;

  try {
    db = await DatabaseService.database;
    await SeedService.seedIfEmpty(db);
  } catch (e) {
    debugPrint('Database init failed: $e');
    shellMode = true;
  }

  if (!shellMode) {
    try { contentService = await ContentService.create(); } catch (e) { debugPrint('ContentService init failed: $e'); shellMode = true; }
    try { ebbinghausService = await EbbinghausService.create(); } catch (e) { debugPrint('EbbinghausService init failed: $e'); shellMode = true; }
    try { streakService = await StreakService.create(); } catch (e) { debugPrint('StreakService init failed: $e'); shellMode = true; }
    if (db != null && ebbinghausService != null) {
      quizService = QuizService(db, ebbinghausService);
    }
  }

  if (shellMode) {
    debugPrint('Starting in shell mode — limited functionality');
  }

  runApp(
    MultiProvider(
      providers: [
        if (quizService != null && streakService != null)
          ChangeNotifierProvider(create: (_) => QuizProvider(quizService!, streakService!)),
        if (streakService != null)
          ChangeNotifierProvider(create: (_) => StreakProvider(streakService!)),
        if (streakService != null)
          Provider.value(value: streakService),
        if (contentService != null)
          Provider.value(value: contentService),
        if (ebbinghausService != null)
          Provider.value(value: ebbinghausService),
      ],
      child: const WenyanApp(),
    ),
  );
}

class WenyanApp extends StatelessWidget {
  const WenyanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '文言打卡',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: const MainScaffold(),
    );
  }
}
