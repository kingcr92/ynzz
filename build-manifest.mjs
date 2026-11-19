#!/usr/bin/env node
// 扫描 files/ 目录，生成 files.json 清单供前端读取。
// 用法：node build-manifest.mjs
// 可重复运行；新增/删除文件后重新执行即可刷新站点内容。

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const filesDir = join(here, "files");
const outFile = join(here, "files.json");

/** 递归收集 files/ 下的所有文件（跳过隐藏文件与 .json 清单） */
function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, base));
    } else if (entry.isFile()) {
      const rel = relative(base, full).split(sep).join("/");
      try {
        const st = statSync(full);
        out.push({
          name: entry.name,
          path: rel,
          size: st.size,
          mtime: st.mtime.toISOString(),
        });
      } catch {
        /* 跳过无法 stat 的文件 */
      }
    }
  }
  return out;
}

let files = [];
try {
  files = walk(filesDir);
} catch (err) {
  console.error("读取 files 目录失败：", err.message);
}

// 按修改时间倒序，最新在前
files.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));

const manifest = {
  generatedAt: new Date().toISOString(),
  count: files.length,
  totalSize: files.reduce((sum, f) => sum + f.size, 0),
  files,
};

writeFileSync(outFile, JSON.stringify(manifest, null, 2), "utf8");
console.log(
  `✅ 已生成 files.json：${files.length} 个文件，合计 ${(
    manifest.totalSize /
    1024 /
    1024
  ).toFixed(2)} MB`
);
console.log(`   清单位置：${outFile}`);