import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/content_service.dart';

class EssayReadScreen extends StatefulWidget {
  final int essayId;
  final String essayTitle;

  const EssayReadScreen({
    super.key,
    required this.essayId,
    required this.essayTitle,
  });

  @override
  State<EssayReadScreen> createState() => _EssayReadScreenState();
}

class _EssayReadScreenState extends State<EssayReadScreen> {
  List<Map<String, dynamic>> _annotations = [];
  List<Map<String, dynamic>> _translations = [];
  bool _loading = true;

  static const Color ink = Color(0xFF1C1914);
  static const Color paper = Color(0xFFFBFAF5);
  static const Color indigo = Color(0xFF3B3F8C);
  static const Color secondary = Color(0xFF6B6560);

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadData());
  }

  Future<void> _loadData() async {
    final contentService = context.read<ContentService>();
    final annotations = await contentService.getAnnotations(widget.essayId);
    final translations = await contentService.getTranslations(widget.essayId);

    if (mounted) {
      setState(() {
        _annotations = annotations;
        _translations = translations;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: paper,
      appBar: AppBar(
        title: Text(
          widget.essayTitle,
          style: const TextStyle(
            fontFamily: 'Noto Serif TC',
            fontWeight: FontWeight.w600,
            fontSize: 18,
            color: ink,
          ),
        ),
        backgroundColor: paper,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: indigo))
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_annotations.isNotEmpty) ...[
                      _buildSectionHeader('字詞註釋', Icons.menu_book_outlined),
                      const SizedBox(height: 12),
                      ..._annotations.map((ann) => _buildAnnotationTile(
                            ann['word'] as String? ?? '',
                            ann['meaning'] as String? ?? '',
                          )),
                      const SizedBox(height: 28),
                    ],
                    if (_translations.isNotEmpty) ...[
                      _buildSectionHeader('原文翻譯', Icons.translate_outlined),
                      const SizedBox(height: 12),
                      ..._translations.map((trans) => _buildTranslationTile(
                            trans['original_segment'] as String? ?? '',
                            trans['translation'] as String? ?? '',
                          )),
                    ],
                    if (_annotations.isEmpty && _translations.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(
                          child: Text(
                            '暫無內容',
                            style: TextStyle(fontSize: 15, color: secondary),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: indigo),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            fontFamily: 'Noto Serif TC',
            color: ink,
          ),
        ),
      ],
    );
  }

  Widget _buildAnnotationTile(String word, String meaning) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: paper,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E3DE)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: indigo.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              word,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                fontFamily: 'Noto Serif TC',
                color: indigo,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              meaning,
              style: const TextStyle(
                fontSize: 15,
                color: ink,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTranslationTile(String original, String translation) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: paper,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E3DE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            original,
            style: const TextStyle(
              fontSize: 16,
              fontFamily: 'Noto Serif TC',
              color: ink,
              height: 1.7,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            height: 1,
            color: const Color(0xFFE5E3DE),
          ),
          const SizedBox(height: 10),
          Text(
            translation,
            style: const TextStyle(
              fontSize: 15,
              color: secondary,
              height: 1.7,
            ),
          ),
        ],
      ),
    );
  }
}
