import 'package:flutter_test/flutter_test.dart';

import 'package:wenyan_checkin/main.dart';

void main() {
  testWidgets('App builds smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const WenyanApp());
    expect(find.byType(WenyanApp), findsOneWidget);
  });
}
