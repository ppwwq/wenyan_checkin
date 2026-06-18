import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/content_service.dart';
import '../services/ebbinghaus_service.dart';
import 'essay_read_screen.dart';

class EssayListScreen extends StatefulWidget {
  const EssayListScreen({super.key});

  @override
  State<EssayListScreen> createState() => _EssayListScreenState();
}

class _EssayListScreenState extends State<EssayListScreen> {
  List<Map<String, dynamic>> _allEssays = [];
  Map<int, Map<String, dynamic>> _essayProgress = {};
  bool _loading = true;
  String _filter = '全部';

  static const Color indigo = Color(0xFF3B3F8C);
  static const Color paper = Color(0xFFFBFAF5);
  static const Color ink = Color(0xFF1C1914);
  static const Color jade = Color(0xFF3B7A5C);
  static const Color secondary = Color(0xFF6B6560);

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadData());
  }

  Future<void> _loadData() async {
    final contentService = context.read<ContentService>();
    final ebbinghausService = context.read<EbbinghausService>();

    final essays = await contentService.getEssays();
    final progressMap = <int, Map<String, dynamic>>{};
    for (final essay in essays) {
      final id = essay['id'] as int;
      progressMap[id] = await ebbinghausService.getEssayProgress(1, id);
    }

    if (mounted) {
      setState(() {
        _allEssays = essays;
        _essayProgress = progressMap;
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredEssays {
    if (_filter == '全部') return _allEssays;

    return _allEssays.where((essay) {
      final id = essay['id'] as int;
      final progress = _essayProgress[id];
      if (progress == null) return _filter == '進行中';
      final total = progress['total'] as int;
      final mastered = progress['mastered'] as int;
      if (_filter == '已通關') {
        return total > 0 && mastered >= total;
      }
      // 進行中
      return total == 0 || mastered < total;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Text(
              '十六篇範文',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                fontFamily: 'Noto Serif TC',
                color: ink,
              ),
            ),
          ),
          const SizedBox(height: 12),
          _buildFilterChips(),
          const SizedBox(height: 8),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    const filters = ['全部', '進行中', '已通關'];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Wrap(
        spacing: 8,
        children: filters.map((f) {
          final selected = _filter == f;
          return ChoiceChip(
            label: Text(
              f,
              style: TextStyle(
                fontSize: 13,
                color: selected ? paper : ink,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
            selected: selected,
            onSelected: (_) => setState(() => _filter = f),
            selectedColor: indigo,
            backgroundColor: paper,
            side: BorderSide(
              color: selected ? indigo : const Color(0xFFE5E3DE),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: indigo));
    }

    final essays = _filteredEssays;
    if (essays.isEmpty) {
      return Center(
        child: Text(
          _filter == '已通關' ? '尚無通關篇章' : '沒有匹配的篇章',
          style: const TextStyle(color: secondary, fontSize: 15),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      itemCount: essays.length,
      itemBuilder: (context, index) => _buildEssayCard(essays[index]),
    );
  }

  Widget _buildEssayCard(Map<String, dynamic> essay) {
    final id = essay['id'] as int;
    final title = essay['title'] as String? ?? '';
    final author = essay['author'] as String? ?? '';
    final dynasty = essay['dynasty'] as String? ?? '';
    final category = essay['category'] as String? ?? '';

    final progress = _essayProgress[id];
    final total = progress?['total'] as int? ?? 0;
    final mastered = progress?['mastered'] as int? ?? 0;
    final isMastered = total > 0 && mastered >= total;
    final progressValue = total > 0 ? mastered / total : 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      color: paper,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isMastered ? jade.withValues(alpha: 0.3) : const Color(0xFFE5E3DE),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => EssayReadScreen(essayId: id, essayTitle: title),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                              color: ink,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isMastered)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: jade.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              '已通關',
                              style: TextStyle(fontSize: 11, color: jade, fontWeight: FontWeight.w600),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          author,
                          style: const TextStyle(fontSize: 13, color: secondary),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 3, height: 3,
                          decoration: BoxDecoration(
                            color: secondary.withValues(alpha: 0.5),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          dynasty,
                          style: TextStyle(fontSize: 13, color: secondary.withValues(alpha: 0.8)),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 3, height: 3,
                          decoration: BoxDecoration(
                            color: secondary.withValues(alpha: 0.5),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          category,
                          style: TextStyle(fontSize: 13, color: secondary.withValues(alpha: 0.8)),
                        ),
                      ],
                    ),
                    if (total > 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              value: progressValue,
                              strokeWidth: 2,
                              color: isMastered ? jade : indigo,
                              backgroundColor: const Color(0xFFE5E3DE),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '$mastered / $total 詞',
                            style: TextStyle(
                              fontSize: 12,
                              color: isMastered ? jade : secondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: secondary, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
