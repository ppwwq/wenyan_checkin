import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wenyan_checkin/main.dart';
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

  testWidgets('shell mode shows startup failure without providers', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const WenyanApp(shellMode: true));

    expect(find.text('啟動失敗'), findsOneWidget);
    expect(find.textContaining('有限功能'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
