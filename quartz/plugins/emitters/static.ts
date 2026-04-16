import { FilePath, QUARTZ, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import fs from "fs"
import { glob } from "../../util/glob"
import { dirname } from "path"

function generateIndexHtml(title: string, files: string[], basePath: string): string {
  const links = files
    .map((file) => {
      const encodedFile = encodeURIComponent(file)
      return `    <li><a href="${basePath}${encodedFile}">${file}</a></li>`
    })
    .join("\n")

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #284b63; }
    ul { list-style: none; padding: 0; }
    li { padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
    a { color: #284b63; text-decoration: none; font-size: 16px; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <ul>
${links}
  </ul>
</body>
</html>`
}

export const Static: QuartzEmitterPlugin = () => ({
  name: "Static",
  async *emit({ argv, cfg }) {
    const staticPath = joinSegments(QUARTZ, "static")
    const fps = await glob("**", staticPath, cfg.configuration.ignorePatterns)
    const outputStaticPath = joinSegments(argv.output, "static")
    await fs.promises.mkdir(outputStaticPath, { recursive: true })

    const dirFiles: Map<string, string[]> = new Map()

    for (const fp of fps) {
      const src = joinSegments(staticPath, fp) as FilePath
      const dest = joinSegments(outputStaticPath, fp) as FilePath
      await fs.promises.mkdir(dirname(dest), { recursive: true })
      await fs.promises.copyFile(src, dest)
      yield dest

      const parts = fp.split("/")
      if (parts.length >= 2) {
        const dirName = parts[0]
        const fileName = parts[parts.length - 1]
        if (!dirFiles.has(dirName)) {
          dirFiles.set(dirName, [])
        }
        if (fileName !== "index.html") {
          dirFiles.get(dirName)!.push(fileName)
        }
      }
    }

    const dirTitles: Record<string, string> = {
      html: "HTML 文档",
      books: "PDF 文档",
    }

    for (const [dirName, files] of dirFiles) {
      if (files.length > 0 && dirTitles[dirName]) {
        const title = dirTitles[dirName]
        const indexContent = generateIndexHtml(title, files.sort(), `/static/${dirName}/`)
        const indexPath = joinSegments(outputStaticPath, dirName, "index.html") as FilePath
        await fs.promises.writeFile(indexPath, indexContent, "utf-8")
        yield indexPath
      }
    }
  },
  async *partialEmit() {},
})
