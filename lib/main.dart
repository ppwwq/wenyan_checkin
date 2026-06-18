import 'package:flutter/material.dart';
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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final db = await DatabaseService.database;
  await SeedService.seedIfEmpty(db);

  final contentService = await ContentService.create();
  final ebbinghausService = await EbbinghausService.create();
  final streakService = await StreakService.create();
  final quizService = QuizService(db, ebbinghausService);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => QuizProvider(quizService, streakService)),
        ChangeNotifierProvider(create: (_) => StreakProvider(streakService)),
        Provider.value(value: contentService),
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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF3B3F8C), surface: const Color(0xFFFBFAF5)),
        fontFamily: 'Noto Sans TC',
        useMaterial3: true,
      ),
      home: const MainScaffold(),
    );
  }
}
