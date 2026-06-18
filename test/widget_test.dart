import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wenyan_checkin/theme/app_theme.dart';

void main() {
  test('AppTheme is valid ThemeData', () {
    final theme = AppTheme.theme;
    expect(theme, isNotNull);
    expect(theme.useMaterial3, isTrue);
    expect(theme.colorScheme, isNotNull);
    expect(theme.scaffoldBackgroundColor, AppTheme.paper);
  });

  test('AppTheme color constants are correct', () {
    expect(AppTheme.ink, const Color(0xFF1C1914));
    expect(AppTheme.paper, const Color(0xFFFBFAF5));
    expect(AppTheme.vermillion, const Color(0xFFC44B3B));
    expect(AppTheme.indigo, const Color(0xFF3B3F8C));
    expect(AppTheme.jade, const Color(0xFF3B7A5C));
    expect(AppTheme.gold, const Color(0xFFB8964A));
    expect(AppTheme.subtle, const Color(0xFFE5E0D5));
    expect(AppTheme.secondary, const Color(0xFF6B6560));
  });

  testWidgets('WenyanApp builds without crash', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        title: '文言打卡',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.theme,
        home: const Scaffold(body: Center(child: Text('Hello'))),
      ),
    );
    expect(find.text('Hello'), findsOneWidget);
  });
}
