import 'package:flutter/material.dart';

class AppTheme {
  static const ink = Color(0xFF1C1914);
  static const paper = Color(0xFFFBFAF5);
  static const vermillion = Color(0xFFC44B3B);
  static const indigo = Color(0xFF3B3F8C);
  static const jade = Color(0xFF3B7A5C);
  static const gold = Color(0xFFB8964A);
  static const amber = Color(0xFFE6A817);
  static const subtle = Color(0xFFE5E0D5);
  static const border = Color(0xFFE5E3DE);
  static const secondary = Color(0xFF6B6560);

  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: indigo,
      surface: paper,
      onSurface: ink,
      primary: indigo,
      onPrimary: paper,
      secondary: jade,
      error: vermillion,
    ),
    scaffoldBackgroundColor: paper,
    fontFamily: 'HYZhongHeiTi',
    appBarTheme: const AppBarTheme(
      backgroundColor: paper, foregroundColor: ink, elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: paper,
      indicatorColor: indigo.withAlpha(30),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ink);
        }
        return const TextStyle(fontSize: 10, color: Color(0xFFBFB9AD));
      }),
    ),
    cardTheme: CardThemeData(
      color: Colors.white, elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: subtle),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: ink, foregroundColor: paper,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
  );
}
