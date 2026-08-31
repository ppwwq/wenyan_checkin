/// 應用版本資料 · 集中管理
///
/// 規約：每次可交付的改動都要升版本號，並在 CHANGELOG.md 記一筆。
///  - 小功能： patch +0.0.1（如 1.1.0 → 1.1.1）
///  - 大功能： minor +0.1.0（如 1.1.0 → 1.2.0）
/// 記得同步更新 pubspec.yaml 的 version（含 build number）。
const String appName = '文言打卡';
const String appBuildVersion = '1.1.1';
const String appVersionLabel = '$appName v$appBuildVersion';
