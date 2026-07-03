// Ensure @types/multer global augmentation is included in the TypeScript compilation.
// This makes Express.Multer.File available across all source files.
import '@types/multer';

// exceljs 的 index.d.ts 把 Workbook.xlsx.load() 的参数类型声明成该文件内部私有、未导出的
// `interface Buffer extends ArrayBuffer {}`,与 Node 真实 Buffer(Uint8Array 子类)结构不兼容——
// 这是三方类型声明的已知不精确之处(exceljs 面向浏览器+Node 双端,其余方法如 readFile 明确接受
// 真实 Node Buffer/路径)。Xlsx 接口本身是导出的,用标准声明合并给 load() 补一个匹配 Node 真实
// Buffer 的重载,不使用 any / as unknown as 绕过类型检查(T2 recruit-sheet-parser.util.ts 用到)。
// 注意:`declare module 'exceljs' {}` 内裸写 `Buffer` 会沿用被扩展模块自身的词法作用域,
// 命中 exceljs 内部那个同名的本地 Buffer(与原始重载一样失败)——必须用 `import('buffer').Buffer`
// 显式按模块路径解析,才能真正拿到 Node 的全局 Buffer。
declare module 'exceljs' {
  interface Xlsx {
    load(
      buffer: import('buffer').Buffer,
      options?: Partial<import('exceljs').XlsxReadOptions>,
    ): Promise<import('exceljs').Workbook>;
  }
}
