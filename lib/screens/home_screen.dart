import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  final VoidCallback? onStartReview;

  const HomeScreen({super.key, this.onStartReview});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('首頁'),
    );
  }
}
