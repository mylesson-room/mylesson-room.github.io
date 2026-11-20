#!/usr/bin/env bash
# GoStudy: read-only SQL export from Supabase Free to a PRIVATE folder on macOS.
# No SQL writes, no database migrations, no production restores, no upload to GitHub.
set -Eeuo pipefail
set +x
umask 077

PROJECT_REF="kawfqlohguwvmmplvrny"
BACKUP_ROOT="${HOME}/GoStudy-private-backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT}/${STAMP}"
TEMP_WORK="$(mktemp -d "${TMPDIR:-/tmp}/gostudy-dump.XXXXXX")"

cleanup() {
  cd "${HOME}" 2>/dev/null || true
  rm -rf -- "${TEMP_WORK}"
}
trap cleanup EXIT

die() { printf >&2 'ОШИБКА: %s\n' "$*"; exit 1; }
say() { printf '\n%s\n' "$*"; }

command -v supabase >/dev/null 2>&1 || die "Нет Supabase CLI. Установите по https://supabase.com/docs/guides/local-development/cli/getting-started"
command -v docker >/dev/null 2>&1 || die "Нет Docker. Установите Docker Desktop: https://docs.docker.com/desktop/setup/install/mac-install/"
docker info >/dev/null 2>&1 || die "Запустите Docker Desktop, затем повторите."
command -v shasum >/dev/null 2>&1 || die "Не найден shasum (стандартная утилита macOS)."

mkdir -p -- "${BACKUP_ROOT}"
mkdir -- "${DEST}" || die "Папка резервной копии уже существует; не перезаписываем прошлую выгрузку."
chmod 700 "${BACKUP_ROOT}" "${DEST}"
printf 'INCOMPLETE — do not use for recovery\n' > "${DEST}/STATUS.txt"

say "GoStudy: сохраняем резервные SQL-файлы только на этом Mac."
say "Местоположение: ${DEST}"
say "Пароль базы и Supabase token НЕ присылайте в чат и НЕ вставляйте в GitHub."
say "Этот скрипт НЕ меняет живую базу, но пока НЕ проверяет восстановление."

cd "${TEMP_WORK}"
supabase --version > "${DEST}/supabase-version.txt"
DUMP_HELP="$(supabase db dump --help)"
if grep -q -- "--remote" <<< "${DUMP_HELP}"; then
  DUMP_TARGET="--remote"  # CLI v3 (2026-11): explicit hosted target
elif grep -q -- "--linked" <<< "${DUMP_HELP}"; then
  DUMP_TARGET="--linked"  # CLI v2 compatible fallback
else
  die "CLI не поддерживает явную выгрузку удалённой базы. Обновите Supabase CLI."
fi
supabase init

say "Шаг 1/4: авторизация Supabase. Следуйте инструкции CLI."
supabase login

say "Шаг 2/4: подключаемся к действующему проекту для чтения."
say "CLI может попросить пароль базы. Вводите его только в локальном терминале."
supabase link --project-ref "${PROJECT_REF}"

say "Шаг 3/4: создаём SQL-выгрузку (roles / schema / data)."
supabase db dump "${DUMP_TARGET}" --role-only --file "${DEST}/roles.sql"
supabase db dump "${DUMP_TARGET}" --file "${DEST}/schema.sql"
supabase db dump "${DUMP_TARGET}" --data-only --use-copy \
  --exclude "storage.buckets_vectors" --exclude "storage.vector_indexes" \
  --file "${DEST}/data.sql"

for name in roles.sql schema.sql data.sql; do
  [[ -s "${DEST}/${name}" ]] || die "Файл ${name} пуст или отсутствует. Копия неполная."
done

# 'auth.users' and actual GoStudy data must be covered; fail closed otherwise.
for table in auth.users public.gostudy_progress public.gostudy_classroom_events public.gostudy_finance_events; do
  if ! grep -Fq "COPY ${table} " "${DEST}/data.sql"; then
    die "Выгрузка не содержит COPY ${table}; нельзя считать её полной. Проверьте формат и охват CLI."
  fi
done

say "Шаг 4/4: вычисляем контрольные хеши и размеры."
(
  cd "${DEST}"
  shasum -a 256 roles.sql schema.sql data.sql > SHA256SUMS.txt
  wc -c roles.sql schema.sql data.sql > FILE_SIZES.txt
)
{
  printf 'project_ref=%s\n' "${PROJECT_REF}"
  printf 'dump_finished_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'status=DUMP_COMPLETE_RESTORE_NOT_TESTED\n'
  printf 'cli_version='
  cat "${DEST}/supabase-version.txt"
  printf 'NOTE: server dump does not contain student browser localStorage.\n'
  printf 'NOTE: a private isolated restore is required before migrations.\n'
} > "${DEST}/MANIFEST.txt"

printf 'DUMP_COMPLETE — RESTORE NOT TESTED\n' > "${DEST}/STATUS.txt"
chmod 600 "${DEST}"/*

say "SQL-файлы сохранены: ${DEST}"
say "Статус: выгрузка получена, НО восстановление ещё НЕ проверено."
say "НЕ отправляйте эту папку, SQL-файлы, ключи или пароли в чат или GitHub."
say "Следующий этап: безопасный restore в отдельном локальном тестовом Supabase и сверка записей."
