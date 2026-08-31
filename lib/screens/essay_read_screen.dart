import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
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
  Map<String, dynamic>? _dseNotes;
  Map<String, dynamic>? _asReference;
  bool _asExpanded = false;
  bool _loading = true;


  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadData());
  }

  Future<void> _loadData() async {
    final contentService = context.read<ContentService>();
    final annotations = await contentService.getAnnotations(widget.essayId);
    final translations = await contentService.getTranslations(widget.essayId);
    final dseNotes = await contentService.getDseNotes(widget.essayId);
    final asReference = await contentService.getAfterSchoolReference(widget.essayId);

    if (mounted) {
      setState(() {
        _annotations = annotations;
        _translations = translations;
        _dseNotes = dseNotes;
        _asReference = asReference;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.paper,
      appBar: AppBar(
        title: Text(
          widget.essayTitle,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            color: AppTheme.ink,
          ),
        ),
        backgroundColor: AppTheme.paper,
        foregroundColor: AppTheme.ink,
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.indigo))
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_dseNotes != null) ...[
                      _buildDseNotesSection(_dseNotes!),
                      const SizedBox(height: 24),
                    ],
                    if (_asReference != null &&
                        ((_asReference!['notes'] as String? ?? '').isNotEmpty)) ...[
                      _buildAfterSchoolSection(_asReference!),
                      const SizedBox(height: 24),
                    ],
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
                            style: TextStyle(fontSize: 15, color: AppTheme.secondary),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildDseNotesSection(Map<String, dynamic> notes) {
    final theme = notes['theme'] as String? ?? '';
    final author = notes['author'] as String? ?? '';
    final translations = (notes['translations'] as List? ?? []).cast<Map<String, dynamic>>();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.indigo.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.indigo.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.school_outlined, size: 20, color: AppTheme.indigo),
              const SizedBox(width: 8),
              Text(
                'DSE 考點${author.isNotEmpty ? ' · $author' : ''}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.ink,
                ),
              ),
            ],
          ),
          if (theme.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('本文主旨', style: TextStyle(fontSize: 12, color: AppTheme.secondary)),
            const SizedBox(height: 6),
            Text(
              theme,
              style: const TextStyle(fontSize: 15, color: AppTheme.ink, height: 1.7),
            ),
          ],
          if (translations.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('重點語譯', style: TextStyle(fontSize: 12, color: AppTheme.secondary)),
            const SizedBox(height: 6),
            ...translations.map((t) => _buildTranslationTile(
                  t['original'] as String? ?? '',
                  t['translation'] as String? ?? '',
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.indigo),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.ink,
          ),
        ),
      ],
    );
  }

  Widget _buildAfterSchoolSection(Map<String, dynamic> ref) {
    final notes = (ref['notes'] as String? ?? '').trim();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.amber.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.amber.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.auto_stories_outlined, size: 20, color: AppTheme.amber),
          const SizedBox(height: 8),
          const Text(
            'AfterSchool 精讀',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppTheme.ink,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '來源：AfterSchool DSE 中文十二篇範文語譯系列（日後出題素材）',
            style: TextStyle(fontSize: 12, color: AppTheme.secondary),
          ),
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: _asExpanded ? 1200 : 220),
            child: SingleChildScrollView(
              child: Text(
                notes,
                style: const TextStyle(fontSize: 14, color: AppTheme.ink, height: 1.7),
              ),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => setState(() => _asExpanded = !_asExpanded),
              icon: Icon(_asExpanded ? Icons.expand_less : Icons.expand_more, size: 18),
              label: Text(_asExpanded ? '收起' : '展開全文'),
              style: TextButton.styleFrom(foregroundColor: AppTheme.indigo),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnnotationTile(String word, String meaning) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.indigo.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              word,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppTheme.indigo,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              meaning,
              style: const TextStyle(
                fontSize: 15,
                color: AppTheme.ink,
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
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            original,
            style: const TextStyle(
              fontSize: 16,
              color: AppTheme.ink,
              height: 1.7,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            height: 1,
            color: AppTheme.border,
          ),
          const SizedBox(height: 10),
          Text(
            translation,
            style: const TextStyle(
              fontSize: 15,
              color: AppTheme.secondary,
              height: 1.7,
            ),
          ),
        ],
      ),
    );
  }
}
