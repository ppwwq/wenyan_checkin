import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';
import 'package:path/path.dart';

class DatabaseService {
  static Database? _database;
  static const _version = 2;
  static const _name = 'wenyan.db';
  static bool _initialized = false;

  static Future<Database> get database async {
    if (!_initialized) {
      if (kIsWeb) {
        databaseFactory = databaseFactoryFfiWeb;
      } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
        sqfliteFfiInit();
        databaseFactory = databaseFactoryFfi;
      }
      // Android/iOS: use native sqflite, no factory override needed
      _initialized = true;
    }
    _database ??= await _initDB();
    return _database!;
  }

  static Future<Database> _initDB() async {
    final dbPath = kIsWeb ? 'wenyan.db' : await getDatabasesPath();
    final path = kIsWeb ? dbPath : join(dbPath, _name);
    return await openDatabase(
      path,
      version: _version,
      onCreate: _onCreate,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onUpgrade: _onUpgrade,
    );
  }

  static Future<void> _onCreate(Database db, int version) async {
    await db.transaction((txn) async {
      await txn.execute('''
      CREATE TABLE essays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        dynasty TEXT NOT NULL,
        category TEXT NOT NULL,
        original_text TEXT NOT NULL,
        exam_heat TEXT NOT NULL DEFAULT 'warm',
        last_exam_year INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    ''');

      await txn.execute('''
      CREATE TABLE annotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        essay_id INTEGER NOT NULL REFERENCES essays(id),
        word TEXT NOT NULL,
        meaning TEXT NOT NULL,
        position INTEGER NOT NULL
      )
    ''');

      await txn.execute('''
      CREATE TABLE translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        essay_id INTEGER NOT NULL REFERENCES essays(id),
        original_segment TEXT NOT NULL,
        translation TEXT NOT NULL,
        position INTEGER NOT NULL
      )
    ''');

      await txn.execute('''
      CREATE TABLE questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        essay_id INTEGER NOT NULL REFERENCES essays(id),
        cross_essay_id INTEGER REFERENCES essays(id),
        annotation_id INTEGER REFERENCES annotations(id),
        type TEXT NOT NULL,
        dimension TEXT NOT NULL,
        difficulty INTEGER NOT NULL DEFAULT 1,
        stem TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        exam_frequency TEXT NOT NULL DEFAULT 'warm',
        source TEXT NOT NULL DEFAULT 'auto_generated'
      )
    ''');

      await txn.execute('''
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        daily_target INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    ''');

      await txn.execute('''
      CREATE TABLE study_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        review_count INTEGER NOT NULL DEFAULT 0,
        interval_days INTEGER NOT NULL DEFAULT 1,
        last_review_date TEXT,
        next_review_date TEXT,
        ease_factor REAL NOT NULL DEFAULT 2.5,
        status TEXT NOT NULL DEFAULT 'learning',
        correct_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, target_type, target_id)
      )
    ''');

      await txn.execute('''
      CREATE TABLE daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        date TEXT NOT NULL,
        questions_done INTEGER NOT NULL DEFAULT 0,
        target_met INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, date)
      )
    ''');

      await txn.execute('''
      CREATE TABLE mistake_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        question_id INTEGER NOT NULL REFERENCES questions(id),
        wrong_answer TEXT,
        date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        retry_count INTEGER NOT NULL DEFAULT 0,
        mastered INTEGER NOT NULL DEFAULT 0
      )
    ''');
    });
  }

  static Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // v2: Backfill questions.annotation_id — the generator emits one question per
    // annotation in the same order, so question[j] maps to annotation[j] per essay.
    // Without this, the due-annotation review channel can never find questions.
    if (oldVersion < 2) {
      // Add correct_count for real answer-accuracy tracking
      final cols = await db.rawQuery('PRAGMA table_info(study_records)');
      final hasCorrectCount = cols.any((c) => c['name'] == 'correct_count');
      if (!hasCorrectCount) {
        await db.execute(
            'ALTER TABLE study_records ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0');
      }

      final essays = await db.query('essays', columns: ['id']);
      for (final essay in essays) {
        final anns = await db.query('annotations',
            where: 'essay_id = ?', orderBy: 'position ASC', columns: ['id'],
            whereArgs: [essay['id']]);
        final qs = await db.query('questions',
            where: 'essay_id = ?', orderBy: 'id ASC', columns: ['id', 'annotation_id'],
            whereArgs: [essay['id']]);
        final annIds = anns.map((a) => a['id'] as int).toList();
        for (int j = 0; j < qs.length; j++) {
          final qid = qs[j]['id'] as int;
          if (j < annIds.length && qs[j]['annotation_id'] == null) {
            await db.update('questions', {'annotation_id': annIds[j]},
                where: 'id = ?', whereArgs: [qid]);
          }
        }
      }
    }
  }

  static Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}
