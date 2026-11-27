/* Build only the new lesson definition. Never reads answers, progress or vocabulary. */
'use strict';
const fs = require('node:fs');
const sourcePath = 'business-ai-finance-b2-02.html';
const lessonPath = 'business-ai-finance-b2-02-new.html';
const slug = 'michael-ai-finance-lesson-2-new';
const namespace = 'michael-finance2-new-v1:';
function build(source = fs.readFileSync(sourcePath, 'utf8')) {
  const original = JSON.parse(source.match(/id="lesson-data">([\s\S]*?)<\/script>/)[1]);
  const config = structuredClone(original);
  config.title = 'NEW — AI in Finance — Lesson 2';
  config.key = 'gostudy-michael-finance2-new-v1';
  config.answerNamespace = namespace;
  config.externalHomework = 'business-ai-finance-b2-02-new-homework.html';
  const remap = value => Array.isArray(value) ? value.map(remap)
    : typeof value === 'object' && value ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k,remap(v)]))
    : namespace + value;
  config.exerciseIds = remap(config.exerciseIds);
  return config;
}
module.exports = {build, sourcePath, lessonPath, slug, namespace};
// Explicit local export only; never write protected material into the public checkout.
if (require.main === module) process.stdout.write(JSON.stringify(build()));
