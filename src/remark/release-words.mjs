// Words that depend on the release a page describes: @tag@, @version@, @python@ and @ref@.
// The values come from the nearest _release.json above the page, so a frozen copy of the docs
// (versioned_docs/version-X/) keeps the words of its own release (stardelt/stardelt-docs#1145).
import fs from 'node:fs';
import path from 'node:path';

const KEYS = ['tag', 'version', 'python', 'ref'];
const cache = new Map();

function wordsFor(file) {
  let dir = path.dirname(file);
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, '_release.json');
    if (fs.existsSync(candidate)) {
      if (!cache.has(candidate)) {
        const words = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        for (const key of KEYS) {
          if (typeof words[key] !== 'string' || words[key] === '') throw new Error(`${candidate}: "${key}" is missing`);
        }
        cache.set(candidate, words);
      }
      return cache.get(candidate);
    }
    dir = path.dirname(dir);
  }
  throw new Error(`${file}: no _release.json in any folder above it`);
}

const fill = (text, words) => text.replace(/@(tag|version|python|ref)@/g, (_, key) => words[key]);

export default function releaseWords() {
  return (tree, file) => {
    const words = wordsFor(file.path);
    const walk = (node) => {
      if (typeof node.value === 'string' && ['text', 'inlineCode', 'code'].includes(node.type)) node.value = fill(node.value, words);
      if (typeof node.url === 'string') node.url = fill(node.url, words);
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}
