// Quick SWC minify test
const swcMinify = await import("@swc/core");

const testCode = `export const foo = 1;`;

console.log("Testing SWC options...");

try {
  const res = await swcMinify.minify(testCode, { module: "es6" });
  console.log("SUCCESS module='es6':", res.code?.substring(0, 60));
} catch (e) {
  console.error("FAIL module='es6':", e.message, e.code);
}

try {
  const res = await swcMinify.minify(testCode, { module: { type: "es6" } });
  console.log("SUCCESS module:{type:'es6'}:", res.code?.substring(0, 60));
} catch (e) {
  console.error("FAIL module:{type:'es6'}:", e.message, e.code);
}
