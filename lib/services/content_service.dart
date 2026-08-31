import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:sqflite/sqflite.dart';
import 'database_service.dart';

class ContentService {
  final Database _db;

  ContentService(this._db);

  static Future<ContentService> create() async {
    return ContentService(await DatabaseService.database);
  }

  Future<List<Map<String, dynamic>>> getEssays({String? category, String? examHeat}) async {
    String sql = 'SELECT * FROM essays';
    final conditions = <String>[];
    final params = <dynamic>[];
    if (category != null) {
      conditions.add('category = ?');
      params.add(category);
    }
    if (examHeat != null) {
      conditions.add('exam_heat = ?');
      params.add(examHeat);
    }
    if (conditions.isNotEmpty) {
      sql += ' WHERE ${conditions.join(" AND ")}';
    }
    sql += ' ORDER BY id';
    return await _db.rawQuery(sql, params);
  }

  Future<Map<String, dynamic>?> getEssay(int id) async {
    final results = await _db.query('essays', where: 'id = ?', whereArgs: [id]);
    return results.isNotEmpty ? results.first : null;
  }

  Future<List<Map<String, dynamic>>> getAnnotations(int essayId) async {
    return await _db.query('annotations',
      where: 'essay_id = ?', whereArgs: [essayId], orderBy: 'position');
  }

  Future<List<Map<String, dynamic>>> getTranslations(int essayId) async {
    return await _db.query('translations',
      where: 'essay_id = ?', whereArgs: [essayId], orderBy: 'position');
  }

  Future<List<Map<String, dynamic>>> getQuestions(int essayId, {String? type, int? difficulty}) async {
    String sql = 'SELECT * FROM questions WHERE essay_id = ?';
    final params = <dynamic>[essayId];
    if (type != null) {
      sql += ' AND type = ?';
      params.add(type);
    }
    if (difficulty != null) {
      sql += ' AND difficulty = ?';
      params.add(difficulty);
    }
    sql += ' ORDER BY id';
    return await _db.rawQuery(sql, params);
  }

  Future<List<Map<String, dynamic>>> getUsers() async {
    return await _db.query('users', orderBy: 'id');
  }

  Future<int> createUser(String name, {int dailyTarget = 5}) async {
    return await _db.insert('users', {'name': name, 'daily_target': dailyTarget});
  }

  // ---- DSE 考點 (curated, certain answers) ----
  static Map<String, dynamic>? _dseNotesCache;

  Future<Map<String, dynamic>?> getDseNotes(int essayId) async {
    if (_dseNotesCache == null) {
      final raw = await rootBundle.loadString('assets/seed_data/dse_notes.json');
      _dseNotesCache = (json.decode(raw) as Map<String, dynamic>);
    }
    return _dseNotesCache?['$essayId'] as Map<String, dynamic>?;
  }

  // ---- AfterSchool 精讀素材 (official reference; 亦可作日後出題資料) ----
  static Map<String, dynamic>? _asRefCache;

  Future<Map<String, dynamic>?> getAfterSchoolReference(int essayId) async {
    if (_asRefCache == null) {
      final raw = await rootBundle.loadString('assets/seed_data/afterschool_reference.json');
      _asRefCache = (json.decode(raw) as Map<String, dynamic>);
    }
    return _asRefCache?['$essayId'] as Map<String, dynamic>?;
  }

  Future<void> updateAnnotation(int id, String word, String meaning) async {
    await _db.update('annotations', {'word': word, 'meaning': meaning}, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> updateEssay(int id, Map<String, dynamic> values) async {
    values['updated_at'] = DateTime.now().toIso8601String();
    await _db.update('essays', values, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> updateUser(int id, Map<String, dynamic> values) async {
    await _db.update('users', values, where: 'id = ?', whereArgs: [id]);
  }
}
