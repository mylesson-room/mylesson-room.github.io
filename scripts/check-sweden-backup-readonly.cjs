'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const s=fs.readFileSync('sweden-backup-check.html','utf8');
for(const key of ['gostudy-sweden-a2-v2','gostudy-sweden-a2-lesson02-v1','gostudy-sweden-a2-homework01-v1','gostudy-sweden-a2-homework02-v1'])
 assert.ok(s.includes(key),'Missing original Sweden data key: '+key);
for(const phrase of ['localStorage.setItem','localStorage.removeItem','localStorage.clear','sessionStorage','fetch(','XMLHttpRequest','sendBeacon','indexedDB','document.cookie'])
 assert.ok(!s.includes(phrase),'Backup page must NEVER access credentials, send data or mutate localStorage: '+phrase);
assert.ok(s.includes('URL.createObjectURL')&&s.includes('file.text()')&&s.includes('file.size>10*1024*1024'));
assert.ok(s.includes("typeof val!=='string'"));
assert.ok(s.includes("localStorage.getItem(key)===val"));
assert.ok(!s.includes('script src=')&&!s.includes('type="module"'));
console.log('SWEDEN BACKUP AUDIT PASS: 4 original keys, zero writes, zero network, local exact raw-value verification, 10MiB file limit.');
