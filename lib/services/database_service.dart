import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseService {
  static Database? _database;
  static const _version = 1;
  static const _name = 'wenyan.db';

  static Future<Database> get database async {
    _database ??= await _initDB();
    return _database!;
  }

  static Future<Database> _initDB() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _name);
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
    // Future migrations go here
  }

  static Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}
