# Михаил: виртуальный класс 1.1 — черновик, НЕ готов к выпуску

База: актуальный `origin/main` fedb136, 27 ноября 2026. Ветка: `feat/michael-classroom-1-1`.

Новый URL: `business-ai-finance-b2-02-new.html`. Домашка: `business-ai-finance-b2-02-new-homework.html`.
Отображаемое название: `NEW — AI in Finance — Lesson 2`. У существующего урока каталог фактически показывает `Can AI predict a financial crisis before it happens?`; его название и начальное назначение сохранены.

## Реализовано в ветке

- Публичная оболочка без материалов/ответов; загрузка из `gostudy_private_lessons` через существующий JWT/RLS-клиент. Slug `michael-ai-finance-lesson-2-new`. Production-запись ещё НЕ создана.
- Семь исходных страниц, включая полный Reading и Decision lab без разделения на дополнительные страницы. Материал не переписан: config builder читает исходный Lesson 2, меняет только идентификаторы и метаданные.
- Стабильный key `gostudy-michael-finance2-new-v1`; namespace ответов и exercise ID `michael-finance2-new-v1:`; page scope `michael-finance2-new-v1`. Старые ответы и сбросы отбрасываются по namespace. Словарь `gostudy-business-ai-shared-v1` и существующая комната сохраняются.
- Общие lesson/workbook/JaaS/live модули; отдельный opt-in CSS. Темы привязаны к ID вошедшего пользователя, default Light. Обработчик темы не обращается к Jitsi и не отправляет событий.
- Опциональная поддержка нового пути в общем модуле домашки. Для остальных страниц сохраняются прежние URL и поведение. Выбор NEW добавлен только в каталог Михаила, initial не изменён.
- Анимация окружения, reduced-motion и адаптивная навигация.

## Проверено

- `node scripts/check-architecture.cjs` — PASS.
- `node scripts/check-jaas-video.cjs` — PASS (существующий автоматический контракт, не реальный звонок).
- `node scripts/check-michael-classroom.cjs` — PASS: глубокое равенство исходного материала, 7/8/4/6, уникальные ID, двусторонняя изоляция replay, общий словарь, отсутствие текста в новых HTML, независимые темы и восстановление предпочтений; отказ при неправильной роли/ученике; canonical redirect преподавателя.
- Проверка синтаксиса изменённых JS и `git diff --check` — PASS.
- Chrome desktop, локальные имитированные роли: просмотр 7 разделов, Enter и blur, student→teacher/teacher→student ответы, повторная загрузка с восстановлением 2 ответов; независимые темы, свободная навигация.
- Встроенный браузер, viewport 390×844: мобильная шапка и горизонтальная навигация, scrollWidth=390. Это НЕ проверка реального iPhone/Safari.
- Прямая ссылка на новую оболочку без входа: только форма авторизации, учебного материала нет.
- Скриншоты первого раздела (только локально в соседней папке `../fluenvia-michael-evidence/`, не включены в публичный репозиторий): `light-desktop.jpg`, `dark-desktop.jpg`, `light-mobile.jpg`, `dark-mobile.jpg`. Утверждение всей серии 7 страниц по исходным макетам НЕ выполнено.

Предпросмотр: `node scripts/preview-michael-classroom.cjs`, `/__qa/student` и `/__qa/teacher?classStudent=e4f31916-6d4c-49c8-9b80-0e2a233fc6c6`. Только локальные фикстуры; production-запросы для ответов не выполняются. Не использовать фикстуры как доказательство RLS или настоящего звонка.

## Блокеры выпуска и точные следующие действия

1. Из прошлого чата получен только основной JPG `telegram-cloud-photo-size-2-5208469611542685034-y.jpg`. 18 файлов `FluenVia_NEW_*` / `FluenVia_LIGHT_*` доступны в истории лишь как sandbox-ссылки. Нужны сами файлы для проверки всех 9 состояний в двух темах; текущий вариант основан на основном референсе и словесном ТЗ.
2. Проверено SELECT в production: constraint `gostudy_finance_lesson_selection_lesson_path_check` допускает только старый `business-ai-finance-b2-02.html` и `business-ai-finance-b2-03.html`. Для назначения NEW необходимо отдельное разрешение пользователя на расширение этого CHECK (см. ниже). Никаких DDL/RLS/UPDATE/DELETE в production не выполнялось.
3. После разрешения: создать миграцию штатным CLI, повторно проверить актуальное ограничение, добавить только один разрешённый путь; создать новую private lesson запись с текущей парой student/teacher из finance room и payload из builder. Не менять existing rows и текущий lesson_path; не импортировать прогресс/ответы/слова.
4. Провести реальные JWT/RLS проверки student/teacher/постороннего аккаунта, выбор OLD/NEW, изоляцию ответов/reset/page, домашку, чат/перевод/словарь и активный звонок с переключением темы. Проверить живую компоновку Jitsi: две карточки до соединения уже есть; расположение двух реальных участников внутри неизменённого Jitsi ещё не подтверждено.
5. Проверить Safari/iPhone и desktop Chrome, регрессии других учеников. Материал других учеников и исходный Lesson 2 не менялись; полного браузерного регресса пока нет.
6. Только после успешных проверок — merge PR / штатный Pages release, затем live URL и NEW в teacher UI. До этого НЕ публиковать. Проверять отсутствие переназначения Михаила и потери данных отдельно; сейчас отсутствие записей в production подтверждено характером выполненных операций, а не полным сравнением всех таблиц.

Предлагаемое изменение схемы (НЕ применено; не меняет RLS и не назначает урок):

```sql
begin;
alter table public.gostudy_finance_lesson_selection
 drop constraint gostudy_finance_lesson_selection_lesson_path_check;
alter table public.gostudy_finance_lesson_selection
 add constraint gostudy_finance_lesson_selection_lesson_path_check
 check (lesson_path in (
  'business-ai-finance-b2-02.html',
  'business-ai-finance-b2-03.html',
  'business-ai-finance-b2-02-new.html'
 ));
commit;
```

## Фоновый ассет

`assets/michael-classroom-london.jpg` — отдельный сгенерированный фон, без людей и UI; оптимизирован JPEG. Генерация встроенным image_gen, исходник сохранён в `/Users/danil/.codex/generated_images/01a21d67-a695-7fe2-b1b9-f1f31f0265ea/exec-4850360f-a783-4819-84e2-579eed46dc0c.png`.

Prompt: “Create a clean photorealistic cinematic background asset for the FluenVia English classroom, landscape 16:9. London Westminster Big Ben prominent on the RIGHT third, seen through a panoramic window from an elegant quiet business office at golden sunset, warm amber sunlight, smoky charcoal shadows, subtle dark desk silhouette along bottom edge, distant Thames and London skyline, atmospheric soft focus and low detail in left and center to allow UI overlay. Premium restrained editorial photography, natural warm ivory and brown palette. Absolutely NO interface, no UI panels, no typography, no words, no screens, no video cards, no people, no neon. This is only a clean environment photograph, not a screenshot. Save generated output locally for website asset.”
