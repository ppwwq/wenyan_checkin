// lib/services/seed_service.dart
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:sqflite/sqflite.dart';

class SeedService {
  static Future<void> seedIfEmpty(Database db) async {
    final count = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM essays')
    );
    if (count != null && count > 0) return; // Already seeded

    // Use transaction for atomicity — all or nothing
    await db.transaction((txn) async {
      final allJson = await rootBundle.loadString('assets/seed_data/all_essays.json');
      final allData = json.decode(allJson) as List;
      for (final essay in allData) {
        await _insertEssayWithRelations(txn, essay);
      }

      // Create default user
      await txn.insert('users', {
        'id': 1,
        'name': '我',
        'daily_target': 5,
      });
    });
  }

  static Future<int> _insertEssayWithRelations(DatabaseExecutor db, Map<String, dynamic> data) async {
    final essayId = await db.insert('essays', {
      'id': data['id'],
      'title': data['title'],
      'author': _guessAuthor(data['title']),
      'dynasty': _guessDynasty(data['title']),
      'category': _guessCategory(data['title']),
      'original_text': data['original_text'] ?? '',
      'exam_heat': 'warm',
    });

    // Insert annotations
    final annotations = data['annotations'] as List? ?? [];
    for (int j = 0; j < annotations.length; j++) {
      final ann = annotations[j];
      await db.insert('annotations', {
        'essay_id': essayId,
        'word': ann['word'],
        'meaning': ann['meaning'],
        'position': j,
      });
    }

    // Insert translations
    final transSegments = data['translation_segments'] as List? ?? [];
    final origSegments = data['original_segments'] as List? ?? [];
    for (int j = 0; j < transSegments.length; j++) {
      await db.insert('translations', {
        'essay_id': essayId,
        'original_segment': j < origSegments.length ? origSegments[j] ?? '' : '',
        'translation': transSegments[j],
        'position': j,
      });
    }

    // Insert auto-generated questions
    final questions = data['questions'] as List? ?? [];
    for (final q in questions) {
      await db.insert('questions', {
        'essay_id': essayId,
        'type': q['type'] ?? 'word_mc',
        'dimension': q['dimension'] ?? '語譯詞解',
        'difficulty': q['difficulty'] ?? 1,
        'stem': q['stem'],
        'options': json.encode(_generateOptions(q['correct_answer'], annotations)),
        'correct_answer': q['correct_answer'],
        'explanation': q['explanation'] ?? '',
        'exam_frequency': 'warm',
        'source': 'auto_generated',
      });
    }

    return essayId;
  }

  static List<String> _generateOptions(String correct, List<dynamic> annotations) {
    final wrong = annotations
        .where((a) => a is Map<String, dynamic> && a['meaning'] != correct)
        .map((a) => (a as Map<String, dynamic>)['meaning'] as String)
        .toSet()
        .take(3)
        .toList();
    while (wrong.length < 3) {
      wrong.add('（無相關解釋）');
    }
    final options = [correct, ...wrong]..shuffle();
    return options;
  }

  static String _guessAuthor(String title) {
    const map = {
      '論仁': '孔子', '魚我所欲也': '孟子', '逍遙遊': '莊子', '勸學': '荀子',
      '廉頗': '司馬遷', '出師表': '諸葛亮', '師說': '韓愈',
      '始得西山': '柳宗元', '岳陽樓記': '范仲淹', '六國論': '蘇洵',
      '山居秋暝': '王維', '月下獨酌': '李白', '登樓': '杜甫',
      '念奴嬌': '蘇軾', '聲聲慢': '李清照', '青玉案': '辛棄疾',
    };
    return map.entries.firstWhere((e) => title.contains(e.key), orElse: () => const MapEntry('', '佚名')).value;
  }

  static String _guessDynasty(String title) {
    const map = {
      '論仁': '先秦', '魚我所欲也': '先秦', '逍遙遊': '先秦', '勸學': '先秦',
      '廉頗': '漢', '出師表': '三國', '師說': '唐',
      '始得西山': '唐', '岳陽樓記': '宋', '六國論': '宋',
      '山居秋暝': '唐', '月下獨酌': '唐', '登樓': '唐',
      '念奴嬌': '宋', '聲聲慢': '宋', '青玉案': '宋',
    };
    return map.entries.firstWhere((e) => title.contains(e.key), orElse: () => const MapEntry('', '未知')).value;
  }

  static String _guessCategory(String title) {
    if (['山居秋暝', '月下獨酌', '登樓'].any((t) => title.contains(t))) return '詩';
    if (['念奴嬌', '聲聲慢', '青玉案'].any((t) => title.contains(t))) return '詞';
    if (title.contains('論仁') || title.contains('論孝') || title.contains('論君子')) return '語錄體';
    if (['魚我所欲也', '師說', '勸學', '六國論'].any((t) => title.contains(t))) return '論說文';
    if (['逍遙遊'].any((t) => title.contains(t))) return '哲理散文';
    return '敘事描寫';
  }
}
