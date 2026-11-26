/* Fetch assigned extra sections through the same authenticated Supabase client. */
(() => {
  const { supplementSlug, workbookScript } = document.currentScript.dataset;
  const config = window.GoStudyLesson;
  const auth = window.GoStudyFinanceAuth;

  async function appendSupplement() {
    if (!auth?.userId()) return;
    const query = new URLSearchParams({
      select: 'lesson_payload',
      slug: 'eq.' + supplementSlug,
      published: 'eq.true',
    });
    const response = await auth.request('/rest/v1/gostudy_private_lessons?' + query, {}, await auth.token());
    const supplement = response.data?.[0]?.lesson_payload;
    if (!response.ok || !Array.isArray(supplement?.steps) || supplement.key !== config.key) return;

    const ids = new Set(config.steps.map(step => step.id));
    for (const step of supplement.steps) {
      if (!step?.id || ids.has(step.id)) return;
      ids.add(step.id);
    }
    config.steps.push(...supplement.steps);
    if (Array.isArray(supplement.lessonWords)) config.lessonWords.push(...supplement.lessonWords);
  }

  appendSupplement().catch(error => {
    console.warn('Optional workbook sections could not be loaded.', error);
  }).finally(() => {
    const script = document.createElement('script');
    script.src = workbookScript;
    document.body.append(script);
  });
})();
